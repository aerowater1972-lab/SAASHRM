import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import {
  CreateReferralDto,
  UpdateReferralStatusDto,
  ReferralListQueryDto,
  ReferralStatus,
} from '../dto/referral.dto';

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  /** Employee submits a referral. Also creates a linked Candidate (source=REFERRAL). */
  async create(tenantId: string, referrerEmployeeId: string, dto: CreateReferralDto) {
    // Link to an existing candidate when one already exists for this email,
    // otherwise create a fresh candidate record in ACTIVE status.
    let candidate = await this.prisma.candidate.findFirst({
      where: { tenantId, email: dto.candidateEmail, deletedAt: null },
    });

    if (!candidate) {
      const [first, ...rest] = dto.candidateName.trim().split(/\s+/);
      candidate = await this.prisma.candidate.create({
        data: {
          tenantId,
          firstName: first ?? dto.candidateName,
          lastName: rest.join(' ') || '-',
          email: dto.candidateEmail,
          phone: dto.candidatePhone,
          resumeUrl: dto.resumeUrl,
          source: 'REFERRAL',
          notes: dto.positionApplied
            ? `Referred for: ${dto.positionApplied}`
            : undefined,
        },
      });
    }

    const referral = await (this.prisma as any).employeeReferral.create({
      data: {
        tenantId,
        referrerEmployeeId,
        referredCandidateId: candidate.id,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        candidatePhone: dto.candidatePhone,
        resumeUrl: dto.resumeUrl,
        positionApplied: dto.positionApplied,
        notes: dto.notes,
        status: 'PENDING',
      },
    });

    return referral;
  }

  /** Employees see their own referrals; HR (canReview) sees all in the tenant. */
  async findAll(
    tenantId: string,
    employeeId: string | null,
    canReview: boolean,
    filters: ReferralListQueryDto & { search?: string } = {},
  ) {
    const where: any = { tenantId };
    if (!canReview) {
      where.referrerEmployeeId = employeeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { candidateName: { contains: filters.search, mode: 'insensitive' } },
        { candidateEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).employeeReferral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { candidate: { select: { id: true, status: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const referral = await (this.prisma as any).employeeReferral.findFirst({
      where: { id, tenantId },
      include: { candidate: { select: { id: true, status: true } } },
    });
    if (!referral) {
      throw new NotFoundException('Referral not found');
    }
    return referral;
  }

  /** HR updates referral status; award bonus + bonusPaidAt when marked HIRED. */
  async updateStatus(tenantId: string, id: string, dto: UpdateReferralStatusDto) {
    const existing = await (this.prisma as any).employeeReferral.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Referral not found');
    }

    const data: any = {
      status: dto.status,
      notes: dto.notes !== undefined ? dto.notes : existing.notes,
    };
    if (dto.bonusAmount !== undefined) {
      data.bonusAmount = dto.bonusAmount;
    }
    if (dto.status === 'HIRED') {
      data.bonusPaidAt = new Date();
      // Fall back to the existing bonus amount if none provided.
      if (data.bonusAmount === undefined && existing.bonusAmount != null) {
        data.bonusAmount = existing.bonusAmount;
      }
    }

    const referral = await (this.prisma as any).employeeReferral.update({
      where: { id },
      data,
    });

    if (dto.status === 'HIRED') {
      await this.eventBus.publish({
        name: 'employee.referral.bonus_earned',
        aggregateId: id,
        aggregateType: 'EmployeeReferral',
        payload: {
          referralId: id,
          referrerEmployeeId: existing.referrerEmployeeId,
          candidateEmail: existing.candidateEmail,
          bonusAmount: referral.bonusAmount,
        },
        tenantId,
      });
    }

    return referral;
  }

  /**
   * Award referral bonus automatically when the referred candidate is hired.
   * Invoked from OnboardingService.convertToEmployee. Idempotent: only touches
   * referrals still in PENDING/REVIEWING that have not been paid yet.
   */
  async awardForHired(tenantId: string, candidateId: string) {
    const pending = await (this.prisma as any).employeeReferral.findMany({
      where: {
        tenantId,
        referredCandidateId: candidateId,
        status: { in: ['PENDING', 'REVIEWING'] },
        bonusPaidAt: null,
      },
    });

    for (const referral of pending) {
      await (this.prisma as any).employeeReferral.update({
        where: { id: referral.id },
        data: { status: 'HIRED', bonusPaidAt: new Date() },
      });
      await this.eventBus
        .publish({
          name: 'employee.referral.bonus_earned',
          aggregateId: referral.id,
          aggregateType: 'EmployeeReferral',
          payload: {
            referralId: referral.id,
            referrerEmployeeId: referral.referrerEmployeeId,
            candidateEmail: referral.candidateEmail,
            bonusAmount: referral.bonusAmount,
          },
          tenantId,
        })
        .catch((err) =>
          console.error('[QW-02] referral bonus event failed', err),
        );
    }

    return { awarded: pending.length };
  }
}
