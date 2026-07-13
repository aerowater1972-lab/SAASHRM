import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { CreateReviewDto } from '../dto/create-review.dto';
import { SubmitReviewDto } from '../dto/submit-review.dto';
import { ReviewListQueryDto } from '../dto/review-list-query.dto';
import { Prisma, ReviewStatus, PerformanceReview } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly workflow: WorkflowEngineService,
  ) {}

  async create(tenantId: string, dto: CreateReviewDto) {
    const cycle = await this.prisma.reviewCycle.findFirst({
      where: { id: dto.cycleId, tenantId },
    });
    if (!cycle) throw new NotFoundException('Review cycle not found');

    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const review = await this.prisma.performanceReview.create({
      data: {
        tenantId,
        cycleId: dto.cycleId,
        employeeId: dto.employeeId,
        reviewerId: dto.reviewerId,
        status: ReviewStatus.PENDING,
      },
    });

    if (dto.ratings?.length) {
      await this.prisma.rating.createMany({
        data: dto.ratings.map((r) => ({
          reviewId: review.id,
          competency: r.competency,
          score: r.score,
          description: r.description,
        })),
      });
    }

    return this.findOne(tenantId, review.id);
  }

  async findAll(
    tenantId: string,
    filters: ReviewListQueryDto,
  ): Promise<PerformanceReview[] | Paginated<PerformanceReview>> {
    const where: Prisma.PerformanceReviewWhereInput = { tenantId };

    if (filters.cycleId) where.cycleId = filters.cycleId;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.reviewerId) where.reviewerId = filters.reviewerId;
    if (filters.status) where.status = filters.status;

    const term = filters.q ?? (filters as any).search;
    if (term) {
      where.OR = [
        { employee: { fullName: { contains: term, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return paginate(
      this.prisma.performanceReview,
      {
        where,
        include: {
          ratings: true,
          cycle: { select: { id: true, name: true, period: true } },
          employee: { select: { id: true, fullName: true, employeeId: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const review = await this.prisma.performanceReview.findFirst({
      where: { id, tenantId },
      include: {
        ratings: true,
        cycle: { select: { id: true, name: true, period: true, status: true } },
        employee: { select: { id: true, fullName: true, employeeId: true } },
        goals: {
          select: { id: true, title: true, status: true, targetValue: true, actualValue: true },
        },
      },
    });
    if (!review) throw new NotFoundException('Performance review not found');
    return review;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateReviewDto & { summary?: string; strengths?: string; improvements?: string }>) {
    const review = await this.findOne(tenantId, id);

    if (review.status === ReviewStatus.COMPLETED) {
      throw new BadRequestException('Cannot edit a completed review');
    }

    const updateData: any = {};
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.strengths !== undefined) updateData.strengths = dto.strengths;
    if (dto.improvements !== undefined) updateData.improvements = dto.improvements;

    if (review.status === ReviewStatus.PENDING) {
      updateData.status = this.workflow.transition('performance-review', review.status, 'START').to as ReviewStatus;
    }

    if (dto.ratings?.length) {
      await this.prisma.rating.deleteMany({ where: { reviewId: id } });
      await this.prisma.rating.createMany({
        data: dto.ratings.map((r) => ({
          reviewId: id,
          competency: r.competency,
          score: r.score,
          description: r.description,
        })),
      });

      const avgScore = dto.ratings.reduce((sum, r) => sum + r.score, 0) / dto.ratings.length;
      updateData.overallScore = Math.round(avgScore * 100) / 100;
    }

    return this.prisma.performanceReview.update({
      where: { id },
      data: updateData,
      include: {
        ratings: true,
        cycle: { select: { id: true, name: true, period: true } },
      },
    });
  }

  async submit(tenantId: string, id: string, dto: SubmitReviewDto) {
    const review = await this.findOne(tenantId, id);

    if (review.status === ReviewStatus.COMPLETED) {
      throw new BadRequestException('Review is already completed');
    }

    const updateData: any = {
      status: this.workflow.transition('performance-review', review.status, 'COMPLETE').to as ReviewStatus,
      submittedAt: new Date(),
    };
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.strengths !== undefined) updateData.strengths = dto.strengths;
    if (dto.improvements !== undefined) updateData.improvements = dto.improvements;

    if (dto.ratings?.length) {
      await this.prisma.rating.deleteMany({ where: { reviewId: id } });
      await this.prisma.rating.createMany({
        data: dto.ratings.map((r) => ({
          reviewId: id,
          competency: r.competency,
          score: r.score,
          description: r.description,
        })),
      });

      const avgScore = dto.ratings.reduce((sum, r) => sum + r.score, 0) / dto.ratings.length;
      updateData.overallScore = Math.round(avgScore * 100) / 100;
    }

    return this.prisma.performanceReview.update({
      where: { id },
      data: updateData,
      include: {
        ratings: true,
        cycle: { select: { id: true, name: true, period: true } },
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
  }

  async findMyReviews(tenantId: string, userId: string) {
    return this.prisma.performanceReview.findMany({
      where: { tenantId, reviewerId: userId },
      include: {
        ratings: true,
        cycle: { select: { id: true, name: true, period: true } },
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
