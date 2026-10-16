import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import {
  Prisma,
  Feedback360,
  FeedbackStatus,
  FeedbackReviewerType,
} from '@prisma/client';
import { CreateFeedback360Dto } from '../dto/feedback360.dto';
import {
  SubmitFeedback360Dto,
  ReviewFeedback360Dto,
  Feedback360ListQueryDto,
} from '../dto/feedback360.dto';

@Injectable()
export class Feedback360Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateFeedback360Dto,
  ): Promise<Feedback360> {
    const existing = await this.prisma.feedback360.findFirst({
      where: {
        tenantId,
        reviewCycleId: dto.reviewCycleId,
        revieweeId: dto.revieweeId,
        reviewerId: dto.reviewerId,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Feedback 360 untuk siklus, reviewee, dan reviewer ini sudah ada',
      );
    }

    return this.prisma.feedback360.create({
      data: {
        tenantId,
        reviewCycleId: dto.reviewCycleId,
        revieweeId: dto.revieweeId,
        reviewerId: dto.reviewerId,
        reviewerType: dto.reviewerType ?? FeedbackReviewerType.PEER,
        status: dto.status ?? FeedbackStatus.PENDING,
        questions:
          dto.questions?.length
            ? {
                create: dto.questions.map((q: any) => {
                  const text =
                    typeof q === 'string' ? q : q.questionText ?? '';
                  return {
                    questionText: text,
                    questionType:
                      typeof q === 'string'
                        ? 'LIKERT_5'
                        : q.questionType ?? 'LIKERT_5',
                    order: typeof q === 'string' ? 0 : q.order ?? 0,
                  };
                }),
              }
            : undefined,
      },
      include: { questions: true },
    });
  }

  async findAll(
    tenantId: string,
    filters: Feedback360ListQueryDto,
  ): Promise<Feedback360[] | Paginated<Feedback360>> {
    const where: Prisma.Feedback360WhereInput = { tenantId };

    if (filters.reviewCycleId) where.reviewCycleId = filters.reviewCycleId;
    if (filters.revieweeId) where.revieweeId = filters.revieweeId;
    if (filters.reviewerId) where.reviewerId = filters.reviewerId;
    if (filters.status) where.status = filters.status;

    const term = filters.search;
    if (term) {
      where.OR = [
        {
          reviewee: {
            fullName: { contains: term, mode: 'insensitive' },
          },
        },
        {
          reviewer: {
            fullName: { contains: term, mode: 'insensitive' },
          },
        },
      ];
    }

    return paginate(
      this.prisma.feedback360,
      {
        where,
        include: {
          questions: true,
          reviewee: {
            select: { id: true, fullName: true, employeeId: true },
          },
          reviewer: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }
  async findOne(tenantId: string, id: string): Promise<Feedback360> {
    const session = await this.prisma.feedback360.findFirst({
      where: { id, tenantId },
      include: {
        questions: true,
        responses: true,
        reviewee: {
          select: { id: true, fullName: true, employeeId: true },
        },
        reviewer: {
          select: { id: true, fullName: true, employeeId: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Feedback 360 tidak ditemukan');
    return session;
  }

  async updateSettings(
    tenantId: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Feedback360> {
    await this.findOne(tenantId, id);
    return this.prisma.feedback360.update({
      where: { id },
      data: data as Prisma.Feedback360UpdateInput,
      include: { questions: true },
    });
  }

  async submit(
    tenantId: string,
    id: string,
    dto: SubmitFeedback360Dto,
  ): Promise<{ submitted: boolean; status: string }> {
    const session = await this.prisma.feedback360.findFirst({
      where: { id, tenantId },
      include: { questions: true },
    });
    if (!session) throw new NotFoundException('Feedback 360 tidak ditemukan');
    if (session.status === FeedbackStatus.SUBMITTED) {
      throw new BadRequestException('Feedback sudah disubmit');
    }

    const questionByText = new Map(
      session.questions.map((q) => [q.questionText.toLowerCase(), q.id]),
    );

    await this.prisma.$transaction([
      this.prisma.feedback360Response.deleteMany({
        where: { feedback360Id: id },
      }),
      this.prisma.feedback360Response.createMany({
        data: dto.responses.map((r) => {
          const questionId =
            questionByText.get((r.questionText ?? '').toLowerCase()) ??
            r.questionId;
          return {
            feedback360Id: id,
            questionId,
            rating: r.rating ?? null,
            comment: r.comment ?? null,
          };
        }),
      }),
      this.prisma.feedback360.update({
        where: { id },
        data: {
          status: FeedbackStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      }),
    ]);

    return { submitted: true, status: FeedbackStatus.SUBMITTED };
  }
  async review(
    tenantId: string,
    id: string,
    dto: ReviewFeedback360Dto,
  ): Promise<Feedback360> {
    const session = await this.findOne(tenantId, id);
    return this.prisma.feedback360.update({
      where: { id },
      data: {
        ...(dto.score !== undefined && { score: dto.score }),
        ...(dto.comment !== undefined && { adminComment: dto.comment }),
        ...(dto.flagForFollowUp !== undefined && {
          flagForFollowUp: dto.flagForFollowUp,
        }),
      },
      include: { questions: true, responses: true },
    });
  }

  async results(id: string): Promise<any> {
    const session = await this.prisma.feedback360.findFirst({
      where: { id },
      include: {
        questions: { include: { responses: true } },
        reviewee: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
    if (!session) throw new NotFoundException('Feedback 360 tidak ditemukan');

    const questions = session.questions.map((q) => {
      const responses = q.responses.filter(
        (r) => typeof r.rating === 'number',
      );
      const avg =
        responses.length > 0
          ? responses.reduce((s, r) => s + Number(r.rating), 0) /
            responses.length
          : 0;
      return {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        averageRating: Math.round(avg * 10) / 10,
        responseCount: responses.length,
        responses: q.responses.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
        })),
      };
    });

    const allRatings = questions.flatMap((q) =>
      q.responses.filter((r) => typeof r.rating === 'number'),
    );
    const overall =
      allRatings.length > 0
        ? allRatings.reduce((s, r) => s + Number(r.rating), 0) /
          allRatings.length
        : 0;

    return {
      feedbackId: session.id,
      reviewee: session.reviewee,
      overallRating: Math.round(overall * 10) / 10,
      totalResponses: allRatings.length,
      questions,
    };
  }

  async employeeSummary(employeeId: string): Promise<any> {
    const sessions = await this.prisma.feedback360.findMany({
      where: { revieweeId: employeeId },
      include: {
        responses: true,
        reviewer: {
          select: { id: true, fullName: true, employeeId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = sessions.length;
    const submitted = sessions.filter(
      (s) => s.status === FeedbackStatus.SUBMITTED,
    ).length;
    const ratings = sessions.flatMap((s) =>
      s.responses.filter((r) => typeof r.rating === 'number'),
    );
    const overall =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length
        : 0;

    return {
      employeeId,
      totalSessions: total,
      submittedSessions: submitted,
      averageRating: Math.round(overall * 10) / 10,
      totalResponses: ratings.length,
      sessions,
    };
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.feedback360.delete({ where: { id } });
  }
}


