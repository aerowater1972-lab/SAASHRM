import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { FeedbackReviewerType, FeedbackStatus, Feedback360Question } from '@prisma/client';

@Injectable()
export class Feedback360Service {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: { status?: string; employeeId?: string }) {
    const where: any = { tenantId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.employeeId) {
      where.OR = [
        { revieweeId: filters.employeeId },
        { reviewerId: filters.employeeId },
      ];
    }
    return this.prisma.feedback360.findMany({
      where,
      include: {
        reviewee: { select: { id: true, fullName: true, employeeId: true } },
        reviewer: { select: { id: true, fullName: true, employeeId: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const feedback = await this.prisma.feedback360.findFirst({
      where: { id, tenantId },
      include: {
        reviewee: true,
        reviewer: true,
        questions: true,
      },
    });
    if (!feedback) throw new NotFoundException('Feedback session not found');
    return feedback;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const questions = dto.questions ?? [];
    if (!dto.reviewerId && dto.reviewerType !== FeedbackReviewerType.SELF) {
      dto.reviewerId = userId;
    }
    return this.prisma.feedback360.create({
      data: {
        tenantId,
        reviewCycleId: dto.reviewCycleId,
        revieweeId: dto.revieweeId,
        reviewerId: dto.reviewerId,
        reviewerType: dto.reviewerType ?? FeedbackReviewerType.SELF,
        status: FeedbackStatus.PENDING,
        questions: {
          create: questions.map((q: string) => ({ questionText: q })),
        },
      },
      include: { questions: true, reviewee: { select: { fullName: true } } },
    });
  }

  async updateSettings(tenantId: string, id: string, dto: any) {
    const existing = await this.prisma.feedback360.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Feedback session not found');
    return this.prisma.feedback360.update({
      where: { id },
      data: { reviewerType: dto.reviewerType },
    });
  }

  async submitReview(tenantId: string, id: string, dto: any) {
    const feedback = await this.prisma.feedback360.findFirst({
      where: { id, tenantId },
      include: { questions: true },
    });
    if (!feedback) throw new NotFoundException('Feedback session not found');
    if ((feedback.status as string) !== 'IN_PROGRESS' && (feedback.status as string) !== 'PENDING') {
      throw new NotFoundException('Feedback session is not active');
    }

    await this.prisma.feedback360Question.createMany({
      data: dto.responses.map((r: any) => ({
        feedback360Id: id,
        questionText: r.questionText,
        questionType: r.questionType,
        rating: r.rating ?? null,
        comment: r.comment ?? null,
      })),
    });

    const answeredCount = await this.prisma.feedback360Question.count({ where: { feedback360Id: id } });
    const totalQuestions = feedback.questions.length;
    const newStatus = answeredCount >= totalQuestions ? FeedbackStatus.SUBMITTED : FeedbackStatus.IN_PROGRESS;

    await this.prisma.feedback360.update({ where: { id }, data: { status: newStatus, submittedAt: new Date() } });
    return { submitted: true, status: newStatus };
  }

  async finalizeReview(tenantId: string, id: string, dto: any) {
    const feedback = await this.prisma.feedback360.findFirst({ where: { id, tenantId } });
    if (!feedback) throw new NotFoundException('Feedback session not found');
    return this.prisma.feedback360.update({
      where: { id },
      data: { status: FeedbackStatus.FINALIZED },
    });
  }

  async getResults(tenantId: string, id: string) {
    const feedback = await this.prisma.feedback360.findFirst({ where: { id, tenantId } });
    if (!feedback) throw new NotFoundException('Feedback session not found');

    const questions = await this.prisma.feedback360Question.findMany({
      where: { feedback360Id: id },
    });

    const scores = questions.map((q) => q.rating).filter((r): r is number => r !== null);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      feedbackId: id,
      averageScore: Math.round(avgScore * 100) / 100,
      totalResponses: questions.length,
      questions,
    };
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.feedback360.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Feedback session not found');
    await this.prisma.feedback360.delete({ where: { id } });
    return { deleted: true };
  }

  async getEmployeeSummary(tenantId: string, employeeId: string) {
    const sessions = await this.prisma.feedback360.findMany({
      where: {
        tenantId,
        OR: [{ revieweeId: employeeId }, { reviewerId: employeeId }],
        status: FeedbackStatus.FINALIZED,
      },
      include: { questions: true },
    });

    const allRatings = sessions.flatMap((s) => s.questions.map((q) => q.rating).filter((r): r is number => r !== null));
    const avgScore = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;

    return {
      employeeId,
      totalSessions: sessions.length,
      averageScore: Math.round(avgScore * 100) / 100,
    };
  }
}