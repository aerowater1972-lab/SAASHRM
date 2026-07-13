import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { ApplicationStatusDto } from '../dto/application-status.dto';
import { CreateInterviewDto } from '../dto/create-interview.dto';
import { InterviewResultDto } from '../dto/interview-result.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import {
  Prisma, ApplicationStatus as PrismaAppStatus, InterviewStatus, OfferStatus, Application } from '@prisma/client';
import { ApplicationListQueryDto } from '../dto/application-list-query.dto';
import { CandidateService } from './candidate.service';

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['SCREENING'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: ['ACCEPTED', 'REJECTED'],
};

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly candidateService: CandidateService,
  ) {}

  async findAll(
    tenantId: string,
    filters: ApplicationListQueryDto,
  ): Promise<Application[] | Paginated<Application>> {
    const where: Prisma.ApplicationWhereInput = { tenantId };

    if (filters.jobPostingId) where.jobPostingId = filters.jobPostingId;
    if (filters.status) where.status = filters.status as PrismaAppStatus;
    if (filters.candidateId) where.candidateId = filters.candidateId;

    const term = filters.q ?? (filters as any).search;
    if (term) {
      where.OR = [
        { candidate: { firstName: { contains: term, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: term, mode: 'insensitive' } } },
        { candidate: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return paginate(
      this.prisma.application,
      {
        where,
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          jobPosting: {
            select: { id: true, title: true, positionId: true },
          },
          interviews: {
            orderBy: { scheduledAt: 'desc' },
          },
          offers: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { appliedAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, tenantId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, resumeUrl: true },
        },
        jobPosting: {
          select: { id: true, title: true, description: true },
        },
        interviews: {
          orderBy: { stage: 'asc' },
        },
        offers: {
          orderBy: { createdAt: 'desc' },
        },
        onboardingDocuments: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  async getPipeline(tenantId: string, jobPostingId?: string) {
    const statuses = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
    const where: Prisma.ApplicationWhereInput = { tenantId };
    if (jobPostingId) where.jobPostingId = jobPostingId;

    const applications = await this.prisma.application.findMany({
      where,
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        jobPosting: { select: { id: true, title: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const columns = statuses.map((status) => ({
      status,
      candidates: applications
        .filter((app) => app.status === status)
        .map((app) => ({
          id: app.id,
          candidateId: app.candidateId,
          firstName: (app as any).candidate?.firstName || '',
          lastName: (app as any).candidate?.lastName || '',
          email: (app as any).candidate?.email || '',
          jobPostingTitle: (app as any).jobPosting?.title || '',
          appliedAt: app.appliedAt,
          notes: app.notes,
        })),
    }));

    const total = applications.length;
    return { total, columns };
  }

  async updateStatus(tenantId: string, id: string, dto: ApplicationStatusDto) {
    const application = await this.findOne(tenantId, id);
    const current = application.status as string;
    const next = dto.status;

    const allowed = VALID_TRANSITIONS[current];
    const isLinearForward = !!allowed && allowed.includes(next);
    if (!isLinearForward) {
      // BR-02: non-linear transitions are only permitted as a manual override
      // by the Recruiter, and must carry a justification.
      if (!dto.justification || !dto.justification.trim()) {
        throw new BadRequestException(
          `Non-linear transition from ${current} to ${next} requires a justification (BR-02). Allowed linear: ${(allowed || []).join(', ') || 'none'}`,
        );
      }
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status: next as PrismaAppStatus },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true } },
        jobPosting: { select: { id: true, title: true } },
      },
    });

    await this.eventBus.publish({
      name: 'application.status.updated',
      aggregateId: id,
      aggregateType: 'Application',
      payload: {
        previousStatus: current,
        newStatus: next,
        override: !isLinearForward,
        justification: dto.justification,
        application: updated,
      },
      tenantId,
    });

    // BR-05: a candidate that did not pass the process (rejected) is scheduled
    // for PII purge/anonymization after the configured retention window.
    if (next === 'REJECTED') {
      await this.candidateService.schedulePurge(tenantId, application.candidateId);
    }

    return updated;
  }

  async addInterview(tenantId: string, applicationId: string, dto: CreateInterviewDto) {
    await this.findOne(tenantId, applicationId);
    return this.prisma.interview.create({
      data: {
        applicationId,
        stage: dto.stage,
        type: dto.type as any,
        interviewerId: dto.interviewerId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes,
        location: dto.location,
        meetingLink: dto.meetingLink,
      },
    });
  }

  async getInterviews(tenantId: string, applicationId: string) {
    await this.findOne(tenantId, applicationId);
    return this.prisma.interview.findMany({
      where: { applicationId },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async updateInterviewResult(tenantId: string, interviewId: string, dto: InterviewResultDto) {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId },
      include: { application: { select: { tenantId: true } } },
    });
    if (!interview || interview.application.tenantId !== tenantId) {
      throw new NotFoundException('Interview not found');
    }
    if (interview.status === InterviewStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled interview');
    }

    return this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status: InterviewStatus.COMPLETED,
      },
    });
  }

  async addOffer(tenantId: string, applicationId: string, dto: CreateOfferDto) {
    await this.findOne(tenantId, applicationId);

    // BR-03: a signed (accepted) offer is immutable; any change must be issued
    // as a new version. Increment the version so revisions don't collide on the
    // unique (applicationId, version) constraint and must be re-sent/re-accepted.
    const latest = await this.prisma.offer.findFirst({
      where: { applicationId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;

    return this.prisma.offer.create({
      data: {
        applicationId,
        version,
        baseSalary: dto.baseSalary,
        allowance: dto.allowance,
        benefitDescription: dto.benefitDescription,
        joinDate: new Date(dto.joinDate),
        notes: dto.notes,
      },
    });
  }

  async getOffers(tenantId: string, applicationId: string) {
    await this.findOne(tenantId, applicationId);
    return this.prisma.offer.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOfferStatus(
    tenantId: string,
    offerId: string,
    action: 'send' | 'accept' | 'reject',
  ) {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId },
      include: {
        application: {
          select: {
            tenantId: true,
            id: true,
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
            jobPosting: { select: { id: true, title: true, positionId: true } },
          },
        },
      },
    });
    if (!offer || offer.application.tenantId !== tenantId) {
      throw new NotFoundException('Offer not found');
    }

    const updates: Record<string, any> = {};
    switch (action) {
      case 'send':
        if (offer.status !== OfferStatus.DRAFT) {
          throw new BadRequestException('Only draft offers can be sent');
        }
        updates.status = OfferStatus.SENT;
        updates.sentAt = new Date();
        break;
      case 'accept':
        if (offer.status !== OfferStatus.SENT) {
          throw new BadRequestException('Only sent offers can be accepted');
        }
        updates.status = OfferStatus.ACCEPTED;
        updates.acceptedAt = new Date();
        break;
      case 'reject':
        if (![OfferStatus.SENT as string, OfferStatus.DRAFT as string].includes(offer.status)) {
          throw new BadRequestException('Only draft or sent offers can be rejected');
        }
        updates.status = OfferStatus.REJECTED;
        updates.rejectedAt = new Date();
        break;
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: updates,
    });

    if (action === 'accept') {
      await this.prisma.application.update({
        where: { id: offer.application.id },
        data: { status: PrismaAppStatus.ACCEPTED },
      });

      const app = offer.application;
      const { candidate } = app;
      await this.eventBus.publishTyped(DomainEventType.APPLICATION_OFFER_ACCEPTED, {
        applicationId: app.id,
        candidateId: candidate.id,
        fullName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        position: app.jobPosting?.title || '',
        grade: '',
        startDate: updated.joinDate?.toISOString() || new Date().toISOString(),
        tenantId,
      }, { aggregateId: offerId, tenantId });
    }

    return updated;
  }
}
