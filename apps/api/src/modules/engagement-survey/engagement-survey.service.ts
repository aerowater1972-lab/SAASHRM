import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { CreateEngagementSurveyDto, UpdateEngagementSurveyDto, SubmitSurveyResponseDto, CreateSurveyActionItemDto, UpdateSurveyActionItemDto, SurveyActionItemFilterDto, SurveyFilterDto } from './dto/engagement-survey.dto';
import { SurveyType, SurveyStatus, QuestionType, ActionStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

interface TargetScope {
  departmentIds?: string[];
  gradeIds?: string[];
  positionIds?: string[];
  employmentTypes?: string[];
}

@Injectable()
export class EngagementSurveyService {
  private readonly logger = new Logger(EngagementSurveyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
  ) {}

  private async resolveTargetEmployees(tenantId: string, targetScope?: string | null): Promise<string[]> {
    if (!targetScope) {
      const employees = await this.prisma.employee.findMany({
        where: { tenantId, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      return employees.map(e => e.id);
    }

    let parsed: TargetScope = {};
    try { parsed = JSON.parse(targetScope); } catch { return []; }

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        employments: {
          some: {
            isActive: true,
            departmentId: parsed.departmentIds ? { in: parsed.departmentIds } : undefined,
            gradeId: parsed.gradeIds ? { in: parsed.gradeIds } : undefined,
          },
        },
      },
      select: { id: true },
    });
    return employees.map(e => e.id);
  }

  async sendReminders(tenantId: string, now: Date = new Date()): Promise<number> {
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const surveys = await this.prisma.engagementSurvey.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        endDate: { gte: now, lte: inThreeDays },
        deletedAt: null,
      },
      include: { responses: { select: { employeeId: true, respondentId: true } } },
    });

    let totalSent = 0;
    for (const survey of surveys) {
      const allTargetIds = await this.resolveTargetEmployees(tenantId, survey.targetScope);
      const respondedIds = new Set(
        survey.responses
          .map(r => survey.isAnonymous ? r.respondentId : r.employeeId)
          .filter(Boolean),
      );
      const pendingIds = allTargetIds.filter(eid => !respondedIds.has(eid));
      if (pendingIds.length === 0) continue;

      for (const employeeId of pendingIds) {
        await this.notification.send({
          tenantId,
          employeeId,
          templateKey: 'survey_reminder',
          title: 'Reminder: Isi Survei',
          body: `Survei "${survey.title}" akan berakhir pada ${survey.endDate.toLocaleDateString('id-ID')}. Silakan isi sebelum deadline.`,
        }).catch(err => this.logger.warn(`Reminder failed for ${employeeId}: ${err.message}`));
      }
      totalSent += pendingIds.length;
    }
    return totalSent;
  }

  private getTemplateQuestions(type: SurveyType): { questionText: string; questionType: string; options?: string[]; isRequired: boolean; order: number }[] {
    if (type === 'ENPS') {
      return [{
        questionText: 'Seberapa besar kemungkinan Anda merekomendasikan perusahaan ini sebagai tempat kerja kepada teman atau kenalan?',
        questionType: 'NPS',
        isRequired: true,
        order: 0,
      }];
    }
    if (type === 'PULSE') {
      return [
        { questionText: 'Saya bangga menjadi bagian dari perusahaan ini', questionType: 'LIKERT_5', isRequired: true, order: 0 },
        { questionText: 'Saya memiliki pemahaman yang jelas tentang tujuan tim saya', questionType: 'LIKERT_5', isRequired: true, order: 1 },
        { questionText: 'Atasan saya memberikan dukungan yang saya butuhkan untuk berhasil', questionType: 'LIKERT_5', isRequired: true, order: 2 },
        { questionText: 'Saya memiliki kesempatan untuk belajar dan berkembang di sini', questionType: 'LIKERT_5', isRequired: true, order: 3 },
        { questionText: 'Rekomendasi atau saran untuk meningkatkan lingkungan kerja', questionType: 'FREE_TEXT', isRequired: false, order: 4 },
      ];
    }
    return [];
  }

  async create(tenantId: string, dto: CreateEngagementSurveyDto, actorId: string) {
    const questions = dto.questions?.length ? dto.questions : this.getTemplateQuestions(dto.type ?? 'PULSE');
    const survey = await this.prisma.engagementSurvey.create({
      data: {
        tenantId,
        title: dto.title,
        type: dto.type,
        isAnonymous: dto.isAnonymous ?? true,
        targetScope: dto.targetScope,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: SurveyStatus.DRAFT,
        createdBy: actorId,
        questions: {
          create: questions.map((q: any, idx: number) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options?.join(',') || null,
            isRequired: q.isRequired ?? true,
            order: q.order ?? idx,
          })),
        },
      },
      include: { questions: true },
    });

    await this.audit.ingest({
      tenantId,
      module: 'engagement_survey',
      entity: 'engagement_survey',
      entityId: survey.id,
      action: 'CREATE',
      changedBy: actorId,
    });

    return survey;
  }

  async findAll(tenantId: string, filters: { type?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const { type, status, startDate, endDate, page = 1, limit = 20 } = filters;
    const where: Prisma.EngagementSurveyWhereInput = { tenantId, deletedAt: null };
    if (type) where.type = type as any;
    if (status) where.status = status as any;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.engagementSurvey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { questions: { orderBy: { order: 'asc' } }, _count: { select: { responses: true } } },
      }),
      this.prisma.engagementSurvey.count({ where }),
    ]);

    return { data, total, page, pageSize: limit };
  }

  async findById(tenantId: string, id: string) {
    return this.findOne(tenantId, id);
  }

  async findOne(tenantId: string, id: string) {
    const survey = await this.prisma.engagementSurvey.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  async update(tenantId: string, id: string, dto: UpdateEngagementSurveyDto, actorId: string) {
    const existing = await this.findOne(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT surveys can be updated');
    }
    if (existing.isAnonymous && dto.isAnonymous === false) {
      throw new BadRequestException('Anonymous survey cannot be changed to identified (BR-01)');
    }

    const questions = dto.questions ? dto.questions.map((q, idx) => ({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options?.join(',') || null,
      isRequired: q.isRequired ?? true,
      order: q.order ?? idx,
    })) : undefined;

    const survey = await this.prisma.engagementSurvey.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        isAnonymous: dto.isAnonymous,
        targetScope: dto.targetScope,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
        questions: questions ? { deleteMany: {}, create: questions } : undefined,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    await this.audit.ingest({
      tenantId: existing.tenantId,
      module: 'engagement_survey',
      entity: 'engagement_survey',
      entityId: id,
      action: 'UPDATE',
      changedBy: actorId,
    });

    if (dto.status === 'ACTIVE' && String(existing.status) !== 'ACTIVE') {
      this.sendSurveyPublishedNotification(tenantId, survey).catch(err =>
        this.logger.warn(`Failed to send survey notification: ${err.message}`),
      );
    }

    return survey;
  }

  private async sendSurveyPublishedNotification(tenantId: string, survey: any) {
    const employees = await this.prisma.employee.findMany({ where: { tenantId }, take: 100 });
    for (const emp of employees) {
      await this.notification.send({
        tenantId,
        employeeId: emp.id,
        templateKey: 'survey.published',
        title: 'Survei Baru Tersedia',
        body: `Survei "${survey.title}" telah diterbitkan. Silakan isi sebelum ${new Date(survey.endDate).toLocaleDateString('id-ID')}.`,
        payload: { surveyId: survey.id, surveyTitle: survey.title },
      });
    }
  }

  async submitResponse(tenantId: string, dto: { surveyId: string; responses: { questionId: string; answerValue: string }[] }, actorId: string) {
    const survey = await this.prisma.engagementSurvey.findFirst({
      where: { id: dto.surveyId, tenantId, status: 'ACTIVE' },
      include: { questions: true },
    });
    if (!survey) throw new NotFoundException('Survey not found or not active');
    if (new Date() < survey.startDate || new Date() > survey.endDate) {
      throw new BadRequestException('Survey is not currently open');
    }

    const questionIds = new Set(survey.questions.map(q => q.id));
    for (const r of dto.responses) {
      if (!questionIds.has(r.questionId)) {
        throw new BadRequestException(`Invalid questionId: ${r.questionId}`);
      }
    }

    const respondentId = survey.isAnonymous ? randomUUID() : null;
    const employeeId = survey.isAnonymous ? null : actorId;
    await this.prisma.surveyResponse.createMany({
      data: dto.responses.map(r => ({
        surveyId: dto.surveyId,
        questionId: r.questionId,
        employeeId,
        respondentId,
        answerValue: r.answerValue,
      })),
    });

    await this.audit.ingest({
      tenantId,
      module: 'engagement_survey',
      entity: 'survey_response',
      entityId: dto.surveyId,
      action: 'SUBMIT',
      changedBy: actorId,
    });

    return { success: true };
  }

  async getResults(tenantId: string, id: string, minThreshold = 5) {
    const survey = await this.findOne(tenantId, id);
    const responses = await this.prisma.surveyResponse.findMany({
      where: { surveyId: id },
      include: { question: true },
    });

    const uniqueByEmployee = new Set(responses.map(r => r.employeeId).filter(Boolean));
    const uniqueByRespondent = new Set(responses.map(r => r.respondentId).filter(Boolean));
    const totalRespondents = survey.isAnonymous ? uniqueByRespondent.size : uniqueByEmployee.size;

    const result: any = {
      survey: { id: survey.id, title: survey.title, type: survey.type, isAnonymous: survey.isAnonymous },
      totalResponses: responses.length,
      totalRespondents,
      minThreshold,
      thresholdMet: totalRespondents >= minThreshold,
    };

    // Department breakdown (only for identified surveys - FR-05)
    if (!survey.isAnonymous && uniqueByEmployee.size > 0) {
      const employeeIds = Array.from(uniqueByEmployee) as string[];
      const employments = await this.prisma.employment.findMany({
        where: { employeeId: { in: employeeIds }, isActive: true },
        select: { employeeId: true, departmentId: true },
      });
      const deptMap = new Map<string, string>();
      for (const emp of employments) {
        if (!deptMap.has(emp.employeeId)) deptMap.set(emp.employeeId, emp.departmentId);
      }

      const deptIds = Array.from(new Set(deptMap.values()));
      const departments = deptIds.length > 0 ? await this.prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, name: true },
      }) : [];
      const deptNameMap = new Map(departments.map(d => [d.id, d.name]));

      result.departmentBreakdown = Array.from(deptMap.entries()).reduce((acc, [empId, deptId]) => {
        if (!acc[deptId]) acc[deptId] = { departmentId: deptId, departmentName: deptNameMap.get(deptId) || deptId, respondentCount: 0, employeeIds: [] };
        acc[deptId].respondentCount++;
        acc[deptId].employeeIds.push(empId);
        return acc;
      }, {} as Record<string, any>);

      for (const dept of Object.values(result.departmentBreakdown) as any[]) {
        const deptRespondentIds = new Set(dept.employeeIds);
        dept.questions = survey.questions.map(q => {
          const qResponses = responses.filter(r => r.questionId === q.id && deptRespondentIds.has(r.employeeId || ''));
          const deptThresholdMet = dept.respondentCount >= minThreshold;
          let stats: any = { count: qResponses.length, respondentCount: dept.respondentCount, thresholdMet: deptThresholdMet };
          if (deptThresholdMet) this.computeQuestionStats(q, qResponses, stats);
          return { ...q, stats };
        });
        delete dept.employeeIds;
      }
      result.departmentBreakdown = Object.values(result.departmentBreakdown);
    }

    result.questions = survey.questions.map(q => {
      const qResponses = responses.filter(r => r.questionId === q.id);
      const respondentCount = survey.isAnonymous
        ? new Set(qResponses.map(r => r.respondentId).filter(Boolean)).size
        : new Set(qResponses.map(r => r.employeeId).filter(Boolean)).size;
      const thresholdMet = respondentCount >= minThreshold;
      let stats: any = { count: qResponses.length, respondentCount, thresholdMet };
      if (thresholdMet) this.computeQuestionStats(q, qResponses, stats);
      return { ...q, stats };
    });

    return result;
  }

  private computeQuestionStats(q: any, qResponses: any[], stats: any) {
    if (q.questionType === 'NPS') {
      const scores = qResponses.map(r => parseInt(r.answerValue)).filter(s => !isNaN(s));
      const promoters = scores.filter(s => s >= 9).length;
      const detractors = scores.filter(s => s <= 6).length;
      stats.enps = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : 0;
      stats.promoters = promoters;
      stats.passives = scores.filter(s => s >= 7 && s <= 8).length;
      stats.detractors = detractors;
    } else if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.questionType)) {
      const options = q.options ? q.options.split(',') : [];
      stats.distribution = options.map((o: string) => ({ option: o, count: qResponses.filter(r => r.answerValue === o).length }));
    } else if (['LIKERT_5', 'LIKERT_7'].includes(q.questionType)) {
      const scores = qResponses.map(r => parseInt(r.answerValue)).filter(s => !isNaN(s));
      stats.average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      stats.distribution = Array.from({ length: q.questionType === 'LIKERT_5' ? 5 : 7 }, (_, i) => i + 1)
        .map(i => ({ value: i, count: scores.filter(s => s === i).length }));
    } else if (q.questionType === 'FREE_TEXT') {
      stats.textAnswers = qResponses.map(r => r.answerValue).filter(Boolean);
    }
  }

  async getEnpsTrend(tenantId: string, filters: { startDate?: string; endDate?: string; periodMonths?: number } = {}) {
    const npsQuestions = await this.prisma.surveyQuestion.findMany({
      where: { survey: { tenantId, type: 'ENPS', status: 'CLOSED' }, questionType: 'NPS' },
      include: { survey: true, responses: true },
    });

    const periodMap = new Map<string, number[]>();
    for (const q of npsQuestions) {
      const endDate = q.survey.endDate.toISOString().slice(0, 7);
      const scores = q.responses.map(r => parseInt(r.answerValue)).filter(s => !isNaN(s));
      if (!periodMap.has(endDate)) periodMap.set(endDate, []);
      periodMap.get(endDate)!.push(...scores);
    }

    return Array.from(periodMap.entries())
      .filter(([period, scores]) => {
        if (!filters.periodMonths) return true;
        const [year, month] = period.split('-').map(Number);
        const entryDate = new Date(year, month - 1, 1);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - filters.periodMonths!);
        return entryDate >= cutoff;
      })
      .map(([period, scores]) => {
        const promoters = scores.filter(s => s >= 9).length;
        const detractors = scores.filter(s => s <= 6).length;
        const enps = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : 0;
        return { period, enpsScore: enps, totalResponses: scores.length };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * QW-03 — Action plan derived from survey results.
   * Reaching 100% progress auto-completes the item (and marking COMPLETED
   * forces progress to 100).
   */
  private resolveStatusAndProgress(
    status: ActionStatus | undefined,
    progress: number | undefined,
    current: { status: ActionStatus; progress: number },
  ) {
    let nextStatus = status ?? current.status;
    let nextProgress = progress ?? current.progress;

    if (progress !== undefined) {
      if (progress >= 100) nextStatus = 'COMPLETED';
      else if (nextStatus === 'COMPLETED') nextStatus = 'IN_PROGRESS';
      else if (nextStatus === 'PENDING' && progress > 0) nextStatus = 'IN_PROGRESS';
    }
    if (nextStatus === 'COMPLETED') nextProgress = 100;

    return { status: nextStatus as ActionStatus, progress: nextProgress };
  }

  /** Load a single action item scoped by tenant (via its parent survey). */
  private async findActionItemOrFail(tenantId: string, id: string) {
    const item = await this.prisma.surveyActionItem.findFirst({
      where: { id, deletedAt: null, survey: { tenantId, deletedAt: null } },
      include: { survey: { select: { id: true, title: true, type: true, status: true } } },
    });
    if (!item) throw new NotFoundException('Action item not found');
    return item;
  }

  /** Decorate an action item with overdue / days-remaining information. */
  private decorate(item: any, now: Date = new Date()) {
    const isOpen = item.status !== 'COMPLETED' && item.status !== 'CANCELLED';
    const dueDate = new Date(item.dueDate);
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return {
      ...item,
      isOverdue: isOpen && dueDate < now,
      daysRemaining: isOpen ? daysRemaining : 0,
    };
  }

  async createActionItem(
    tenantId: string,
    dto: {
      surveyId: string;
      title: string;
      description?: string;
      assigneeId: string;
      dueDate: string;
      progress?: number;
    },
    actorId: string,
  ) {
    const survey = await this.findOne(tenantId, dto.surveyId);
    const { status, progress } = this.resolveStatusAndProgress(undefined, dto.progress ?? 0, {
      status: 'PENDING',
      progress: 0,
    });

    const item = await this.prisma.surveyActionItem.create({
      data: {
        surveyId: survey.id,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        dueDate: new Date(dto.dueDate),
        progress,
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });

    await this.audit.ingest({
      tenantId,
      module: 'engagement_survey',
      entity: 'survey_action_item',
      entityId: item.id,
      action: 'CREATE',
      changedBy: actorId,
    });

    await this.notifyAssignee(tenantId, item, survey.title, 'assigned');

    return this.decorate(item);
  }

  async updateActionItem(tenantId: string, id: string, dto: UpdateSurveyActionItemDto, actorId: string) {
    const existing = await this.findActionItemOrFail(tenantId, id);

    const { status, progress } = this.resolveStatusAndProgress(dto.status, dto.progress, {
      status: existing.status as ActionStatus,
      progress: existing.progress,
    });

    const updated = await this.prisma.surveyActionItem.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        progress,
        status,
        completedAt: status === 'COMPLETED' ? (existing.completedAt ?? new Date()) : null,
        // Re-arm the overdue reminder when the deadline moves.
        reminderSentAt: dto.dueDate ? null : undefined,
      },
    });

    await this.audit.ingest({
      tenantId,
      module: 'engagement_survey',
      entity: 'survey_action_item',
      entityId: id,
      action: 'UPDATE',
      changedBy: actorId,
    });

    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.notifyAssignee(tenantId, updated, (existing.survey as any)?.title ?? 'survey', 'assigned');
    }

    return this.decorate(updated);
  }

  /** Owner (assignee) updates progress only — cannot rename or reassign. */
  async updateProgress(tenantId: string, id: string, progress: number, actorId: string) {
    const existing = await this.findActionItemOrFail(tenantId, id);
    if (existing.assigneeId !== actorId) {
      throw new ForbiddenException('You can only update progress on action items assigned to you');
    }

    const { status } = this.resolveStatusAndProgress(undefined, progress, {
      status: existing.status as ActionStatus,
      progress: existing.progress,
    });

    const updated = await this.prisma.surveyActionItem.update({
      where: { id },
      data: {
        progress: status === 'COMPLETED' ? 100 : progress,
        status,
        completedAt: status === 'COMPLETED' ? (existing.completedAt ?? new Date()) : null,
      },
    });

    await this.audit.ingest({
      tenantId,
      module: 'engagement_survey',
      entity: 'survey_action_item',
      entityId: id,
      action: 'UPDATE_PROGRESS',
      changedBy: actorId,
    });

    return this.decorate(updated);
  }

  /** Aggregated progress dashboard for a survey, or for the whole tenant. */
  async getActionItemSummary(tenantId: string, surveyId?: string) {
    const items = await this.prisma.surveyActionItem.findMany({
      where: {
        deletedAt: null,
        survey: { tenantId, deletedAt: null },
        ...(surveyId ? { surveyId } : {}),
      },
      select: { id: true, status: true, progress: true, dueDate: true, assigneeId: true },
    });

    const now = new Date();
    const byStatus: Record<ActionStatus, number> = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    const perAssignee = new Map<string, { total: number; completed: number; overdue: number }>();
    let overdue = 0;
    let progressSum = 0;

    for (const item of items) {
      byStatus[item.status as ActionStatus] += 1;
      progressSum += item.progress ?? 0;
      const isOpen = item.status !== 'COMPLETED' && item.status !== 'CANCELLED';
      const isLate = isOpen && item.dueDate < now;
      if (isLate) overdue += 1;

      const acc = perAssignee.get(item.assigneeId) ?? { total: 0, completed: 0, overdue: 0 };
      acc.total += 1;
      if (item.status === 'COMPLETED') acc.completed += 1;
      if (isLate) acc.overdue += 1;
      perAssignee.set(item.assigneeId, acc);
    }

    const total = items.length;
    const completed = byStatus.COMPLETED;

    return {
      total,
      byStatus,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageProgress: total > 0 ? Math.round(progressSum / total) : 0,
      byAssignee: Array.from(perAssignee.entries())
        .map(([assigneeId, v]) => ({
          assigneeId,
          ...v,
          completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  /**
   * Notify assignees of overdue action items. Driven by the module scheduler;
   * throttled to one reminder per item per 24h through `reminderSentAt`.
   */
  async sendOverdueReminders(tenantId: string, now: Date = new Date()): Promise<number> {
    const overdue = await this.prisma.surveyActionItem.findMany({
      where: {
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: now },
        survey: { tenantId, deletedAt: null },
        OR: [
          { reminderSentAt: null },
          { reminderSentAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
      include: { survey: { select: { title: true } } },
    });

    let sent = 0;
    for (const item of overdue) {
      await this.notification
        .send({
          tenantId,
          userId: item.assigneeId,
          templateKey: 'survey_action_item_overdue',
          title: 'Action Item Terlambat',
          body: `Action item "${item.title}" (${
            (item.survey as any)?.title ?? 'survey'
          }) sudah melewati deadline ${new Date(item.dueDate).toLocaleDateString(
            'id-ID',
          )}. Progress saat ini ${item.progress}%.`,
          payload: { actionItemId: item.id, surveyId: item.surveyId },
        })
        .catch((err) =>
          this.logger.warn(`[QW-03] overdue reminder failed for ${item.id}: ${err.message}`),
        );

      await this.prisma.surveyActionItem.update({
        where: { id: item.id },
        data: { reminderSentAt: now },
      });
      sent += 1;
    }
    return sent;
  }

  /** Fire-and-forget notification to an action item owner. */
  private async notifyAssignee(
    tenantId: string,
    item: { id: string; assigneeId: string; title: string; dueDate: Date },
    surveyTitle: string,
    kind: 'assigned' | 'completed',
  ) {
    await this.notification
      .send({
        tenantId,
        userId: item.assigneeId,
        templateKey: `survey_action_item_${kind}`,
        title: kind === 'assigned' ? 'Action Item Baru untuk Anda' : 'Action Item Selesai',
        body:
          kind === 'assigned'
            ? `Anda ditugaskan mengerjakan action item "${item.title}" dari survei "${surveyTitle}", deadline ${new Date(
                item.dueDate,
              ).toLocaleDateString('id-ID')}.`
            : `Action item "${item.title}" telah diselesaikan.`,
        payload: { actionItemId: item.id },
      })
      .catch((err) => this.logger.warn(`[QW-03] assignee notification failed: ${err.message}`));
  }

  async delete(tenantId: string, id: string, actorId: string) {
    await this.findOne(tenantId, id);
    await this.prisma.engagementSurvey.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.ingest({
      tenantId,
      module: 'engagement_survey',
      entity: 'engagement_survey',
      entityId: id,
      action: 'DELETE',
      changedBy: actorId,
    });
  }

  async getActionItems(tenantId: string, surveyId: string) {
    await this.findOne(tenantId, surveyId);
    const items = await this.prisma.surveyActionItem.findMany({
      where: { surveyId, deletedAt: null, survey: { tenantId, deletedAt: null } },
      orderBy: [{ dueDate: 'asc' }],
      include: { survey: { select: { id: true, title: true, type: true, status: true } } },
    });
    return items.map((i) => this.decorate(i));
  }

  /** Cross-survey action item list with filters (HR view + "my items"). */
  async listActionItems(
    tenantId: string,
    filters: SurveyActionItemFilterDto = {},
    viewerId?: string,
  ) {
    const { status, surveyStatus, overdueOnly, mineOnly, search, page = 1, limit = 20 } = filters;

    const surveyScope: Prisma.EngagementSurveyWhereInput = { tenantId, deletedAt: null };
    if (surveyStatus) surveyScope.status = surveyStatus;

    const where: Prisma.SurveyActionItemWhereInput = { deletedAt: null, survey: surveyScope };
    if (status) where.status = status;
    if (mineOnly && viewerId) where.assigneeId = viewerId;
    if (overdueOnly) {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.surveyActionItem.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { survey: { select: { id: true, title: true, type: true, status: true } } },
      }),
      this.prisma.surveyActionItem.count({ where }),
    ]);

    return { data: data.map((i) => this.decorate(i)), total, page, pageSize: limit };
  }

  /** Action items assigned to the current user, across all surveys. */
  async getMyActionItems(tenantId: string, userId: string, status?: ActionStatus) {
    const items = await this.prisma.surveyActionItem.findMany({
      where: {
        assigneeId: userId,
        deletedAt: null,
        survey: { tenantId, deletedAt: null },
        ...(status ? { status } : {}),
      },
      orderBy: { dueDate: 'asc' },
      include: { survey: { select: { id: true, title: true, type: true, status: true } } },
    });
    return items.map((i) => this.decorate(i));
  }

  /** Soft-delete an action item (kept for auditability). */
  async deleteActionItem(tenantId: string, id: string, actorId: string) {
    await this.findActionItemOrFail(tenantId, id);
    await this.prisma.surveyActionItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.ingest({
      tenantId,
      module: 'engagement_survey',
      entity: 'survey_action_item',
      entityId: id,
      action: 'DELETE',
      changedBy: actorId,
    });
    return { deleted: true };
  }
}