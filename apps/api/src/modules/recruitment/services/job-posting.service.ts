import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { CreateJobPostingDto } from '../dto/create-job-posting.dto';
import { JobPostingListQueryDto } from '../dto/job-posting-list-query.dto';
import { Prisma, PostingStatus, JobPosting } from '@prisma/client';

@Injectable()
export class JobPostingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateJobPostingDto) {
    return this.prisma.jobPosting.create({
      data: {
        tenantId,
        positionId: dto.positionId,
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        responsibilities: dto.responsibilities,
        minSalary: dto.minSalary,
        maxSalary: dto.maxSalary,
        employmentType: dto.employmentType,
        location: dto.location,
        slots: dto.slots ?? 1,
        requisitionId: dto.requisitionId,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: JobPostingListQueryDto,
  ): Promise<JobPosting[] | Paginated<JobPosting>> {
    const where: Prisma.JobPostingWhereInput = { tenantId };

    if (filters.status) {
      where.status = filters.status;
    }

    const term = filters.q ?? filters.search;
    if (term) {
      const s = term;
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.jobPosting,
      {
        where,
        include: {
          applications: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id, tenantId },
      include: {
        applications: {
          include: {
            candidate: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { appliedAt: 'desc' },
        },
      },
    });
    if (!posting) {
      throw new NotFoundException('Job posting not found');
    }
    return posting;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateJobPostingDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.jobPosting.update({
      where: { id },
      data: {
        ...dto,
        minSalary: dto.minSalary,
        maxSalary: dto.maxSalary,
        slots: dto.slots,
      },
    });
  }

  async publish(tenantId: string, id: string) {
    const posting = await this.findOne(tenantId, id);
    if (posting.status !== PostingStatus.DRAFT) {
      throw new BadRequestException('Only draft postings can be published');
    }

    // BR-01: a posting tied to a job requisition may only be published once
    // that requisition has been approved.
    if (posting.requisitionId) {
      const requisition = await this.prisma.jobRequisition.findFirst({
        where: { id: posting.requisitionId, tenantId },
        select: { id: true, status: true },
      });
      if (!requisition) {
        throw new NotFoundException('Linked job requisition not found');
      }
      if (requisition.status !== 'approved') {
        throw new BadRequestException(
          `Cannot publish: job requisition is '${requisition.status}', expected 'approved'`,
        );
      }
    }

    return this.prisma.jobPosting.update({
      where: { id },
      data: { status: PostingStatus.PUBLISHED, postedAt: new Date() },
    });
  }

  async close(tenantId: string, id: string) {
    const posting = await this.findOne(tenantId, id);
    if (posting.status === PostingStatus.CLOSED) {
      throw new BadRequestException('Job posting is already closed');
    }
    return this.prisma.jobPosting.update({
      where: { id },
      data: { status: PostingStatus.CLOSED, closedAt: new Date() },
    });
  }
}
