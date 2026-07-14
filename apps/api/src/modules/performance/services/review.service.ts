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
    currentUserId?: string,
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

    const result = await paginate(
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

    const items = Array.isArray(result) ? result : (result as any).data;
    this.maskPeerReviews(items, currentUserId);
    return result as any;
  }

  async findOne(tenantId: string, id: string, currentUserId?: string) {
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
    this.maskPeerReviews([review], currentUserId);
    return review;
  }

  /**
   * BR-03: anonymize non-self reviews (peer feedback). The reviewer identity is hidden from
   * everyone except the reviewer themself.  Manager reviews are not distinguished from peer
   * reviews in this release (no managerId on Employment); that refinement is a documented gap.
   */
  private maskPeerReviews(items: any[], currentUserId?: string): void {
    if (!currentUserId || !items?.length) return;
    for (const r of items) {
      if (r.reviewerId !== r.employeeId && r.reviewerId !== currentUserId) {
        r.reviewerId = null;
      }
    }
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

  /** US-05 / FR-06: historical final scores and reviews across all cycles for an employee. */
  async getPerformanceHistory(tenantId: string, employeeId: string, currentUserId?: string) {
    const finalScores = await this.prisma.finalScore.findMany({
      where: { employeeId },
      include: {
        cycle: { select: { id: true, name: true, period: true, startDate: true, endDate: true } },
      },
      orderBy: { finalizedAt: 'desc' },
    });

    const reviews = await this.prisma.performanceReview.findMany({
      where: { employeeId, tenantId },
      include: {
        ratings: true,
        cycle: { select: { id: true, name: true, period: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.maskPeerReviews(finalScores, currentUserId);
    this.maskPeerReviews(reviews, currentUserId);
    return { employeeId, finalScores, reviews };
  }
}
