import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CandidateListQueryDto } from '../dto/candidate-list-query.dto';
import { Prisma, CandidateStatus, Candidate } from '@prisma/client';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCandidateDto) {
    const existing = await this.prisma.candidate.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Candidate with this email already exists');
    }

    return this.prisma.candidate.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        resumeUrl: dto.resumeUrl,
        source: dto.source,
        currentCompany: dto.currentCompany,
        currentPosition: dto.currentPosition,
        notes: dto.notes,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: CandidateListQueryDto,
  ): Promise<Candidate[] | Paginated<Candidate>> {
    const where: Prisma.CandidateWhereInput = { tenantId, deletedAt: null };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.source) {
      where.source = filters.source;
    }

    const term = filters.q ?? filters.search;
    if (term) {
      const s = term;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { currentCompany: { contains: s, mode: 'insensitive' } },
        { currentPosition: { contains: s, mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.candidate,
      {
        where,
        include: {
          applications: {
            include: {
              jobPosting: {
                select: { id: true, title: true },
              },
            },
            orderBy: { appliedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        applications: {
          include: {
            jobPosting: {
              select: { id: true, title: true, status: true },
            },
          },
          orderBy: { appliedAt: 'desc' },
        },
      },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCandidateDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.candidate.update({
      where: { id },
      data: dto,
    });
  }

  async apply(tenantId: string, candidateId: string, jobPostingId: string, expectedSalary?: number) {
    const candidate = await this.findOne(tenantId, candidateId);

    if ((candidate as any).status === CandidateStatus.HIRED) {
      throw new ConflictException('Hired candidates cannot apply to new jobs');
    }

    const activePipeline = await this.prisma.application.findFirst({
      where: {
        candidateId,
        status: { in: ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER'] as any },
      },
    });
    if (activePipeline) {
      throw new ConflictException(
        'Candidate already has an active application pipeline. Withdraw or complete it first.',
      );
    }

    const posting = await this.prisma.jobPosting.findFirst({
      where: { id: jobPostingId, tenantId },
    });
    if (!posting) {
      throw new NotFoundException('Job posting not found');
    }

    const existingApplication = await this.prisma.application.findFirst({
      where: { jobPostingId, candidateId },
    });
    if (existingApplication) {
      throw new ConflictException('Candidate has already applied to this job');
    }

    return this.prisma.application.create({
      data: {
        tenantId,
        jobPostingId,
        candidateId,
        expectedSalary,
      },
    });
  }

  /**
   * BR-05: configurable retention period (in months) for candidate PII after
   * a failed recruitment process. Defaults to 6 months; override via
   * CANDIDATE_RETENTION_MONTHS env (PRD allows 6-12 months).
   */
  getRetentionMonths(): number {
    const raw = process.env.CANDIDATE_RETENTION_MONTHS;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 6;
  }

  computePurgeAfter(from: Date = new Date()): Date {
    const d = new Date(from);
    d.setMonth(d.getMonth() + this.getRetentionMonths());
    return d;
  }

  /** Mark a rejected candidate for PII purge after the retention period. */
  async schedulePurge(tenantId: string, candidateId: string, now: Date = new Date()) {
    const candidate = await this.findOne(tenantId, candidateId);
    if (candidate.anonymizedAt) {
      return candidate;
    }
    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: { purgeAfter: candidate.purgeAfter ?? this.computePurgeAfter(now) },
    });
  }

  /** Anonymize a single candidate's PII and delete their private documents. */
  async anonymizeCandidate(tenantId: string, candidateId: string, now: Date = new Date()) {
    const appIds = (
      await this.prisma.application.findMany({
        where: { candidateId },
        select: { id: true },
      })
    ).map((a) => a.id);

    if (appIds.length) {
      await this.prisma.onboardingDocument.deleteMany({
        where: { applicationId: { in: appIds } },
      });
    }

    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED',
        email: `anonymized_${candidateId}@purged.local`,
        phone: null,
        resumeUrl: null,
        currentCompany: null,
        currentPosition: null,
        notes: null,
        anonymizedAt: now,
      },
    });

    return this.prisma.candidate.findUnique({ where: { id: candidateId } });
  }

  /**
   * BR-05: purge every rejected candidate whose retention window has elapsed.
   * Returns the number of candidates anonymized.
   */
  async purgeExpiredCandidates(now: Date = new Date()): Promise<number> {
    const expired = await this.prisma.candidate.findMany({
      where: {
        purgeAfter: { not: null, lte: now },
        anonymizedAt: null,
      },
      select: { id: true, tenantId: true },
    });

    for (const c of expired) {
      await this.anonymizeCandidate(c.tenantId, c.id, now);
    }

    return expired.length;
  }
}
