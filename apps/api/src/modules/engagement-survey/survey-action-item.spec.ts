import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EngagementSurveyService } from './engagement-survey.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { NotificationService } from '@modules/shared/notification/notification.service';

/**
 * QW-03 — Action Items pasca-survey (owner, deadline, status, progress).
 */
describe('EngagementSurveyService — action items (QW-03)', () => {
  let service: EngagementSurveyService;

  const mockPrisma = {
    engagementSurvey: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    surveyResponse: { createMany: jest.fn(), findMany: jest.fn() },
    surveyQuestion: { findMany: jest.fn() },
    surveyActionItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    employee: { findMany: jest.fn() },
    employment: { findMany: jest.fn() },
    department: { findMany: jest.fn() },
    tenant: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const mockAudit = { ingest: jest.fn().mockResolvedValue({}) };
  const mockNotification = { send: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementSurveyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<EngagementSurveyService>(EngagementSurveyService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createActionItem', () => {
    it('creates the action plan item, audits it and notifies the owner', async () => {
      mockPrisma.engagementSurvey.findFirst.mockResolvedValue({ id: 's1', tenantId: 't1', title: 'Pulse Q3' });
      mockPrisma.surveyActionItem.create.mockResolvedValue({
        id: 'ai1',
        surveyId: 's1',
        assigneeId: 'user-2',
        dueDate: new Date('2026-12-31'),
        status: 'PENDING',
        progress: 0,
      });

      const result = await service.createActionItem(
        't1',
        { surveyId: 's1', title: 'Perbaiki kerja sama tim', assigneeId: 'user-2', dueDate: '2026-12-31' },
        'actor1',
      );

      expect(result.id).toBe('ai1');
      expect(mockPrisma.surveyActionItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ surveyId: 's1', assigneeId: 'user-2', status: 'PENDING', progress: 0 }),
        }),
      );
      expect(mockAudit.ingest).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', entity: 'survey_action_item', action: 'CREATE' }),
      );
      expect(mockNotification.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-2', templateKey: 'survey_action_item_assigned' }),
      );
    });

    it('creating with progress=100 immediately marks the item COMPLETED', async () => {
      mockPrisma.engagementSurvey.findFirst.mockResolvedValue({ id: 's1', tenantId: 't1', title: 'ENPS' });
      mockPrisma.surveyActionItem.create.mockResolvedValue({ id: 'ai2', status: 'COMPLETED', progress: 100 });

      await service.createActionItem(
        't1',
        { surveyId: 's1', title: 'X', assigneeId: 'u1', dueDate: '2026-12-01', progress: 100 },
        'actor1',
      );

      expect(mockPrisma.surveyActionItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED', progress: 100, completedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('updateActionItem', () => {
    it('auto-completes when progress reaches 100', async () => {
      mockPrisma.surveyActionItem.findFirst.mockResolvedValue({
        id: 'ai1',
        status: 'IN_PROGRESS',
        progress: 40,
        completedAt: null,
        survey: { title: 'Pulse' },
      });
      mockPrisma.surveyActionItem.update.mockResolvedValue({ id: 'ai1', status: 'COMPLETED', progress: 100 });

      const result = await service.updateActionItem('t1', 'ai1', { progress: 100 }, 'actor1');

      expect(mockPrisma.surveyActionItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED', progress: 100, completedAt: expect.any(Date) }),
        }),
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('re-opens a completed item when progress drops below 100', async () => {
      mockPrisma.surveyActionItem.findFirst.mockResolvedValue({
        id: 'ai1',
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        survey: { title: 'Pulse' },
      });
      mockPrisma.surveyActionItem.update.mockResolvedValue({ id: 'ai1', status: 'IN_PROGRESS', progress: 60 });

      await service.updateActionItem('t1', 'ai1', { progress: 60 }, 'actor1');

      expect(mockPrisma.surveyActionItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IN_PROGRESS', progress: 60, completedAt: null }),
        }),
      );
    });

    it('notifies the new owner when the item is reassigned', async () => {
      mockPrisma.surveyActionItem.findFirst.mockResolvedValue({
        id: 'ai1',
        assigneeId: 'u-old',
        status: 'PENDING',
        progress: 0,
        completedAt: null,
        survey: { title: 'Pulse' },
      });
      mockPrisma.surveyActionItem.update.mockResolvedValue({ id: 'ai1', assigneeId: 'u-new' });

      await service.updateActionItem('t1', 'ai1', { assigneeId: 'u-new' }, 'actor1');

      expect(mockNotification.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-new', templateKey: 'survey_action_item_assigned' }),
      );
    });
  });

  describe('updateProgress (owner self-service)', () => {
    it('lets the assignee bump progress', async () => {
      mockPrisma.surveyActionItem.findFirst.mockResolvedValue({
        id: 'ai1',
        assigneeId: 'owner-1',
        status: 'PENDING',
        progress: 0,
        completedAt: null,
        survey: { title: 'Pulse' },
      });
      mockPrisma.surveyActionItem.update.mockResolvedValue({ id: 'ai1', status: 'IN_PROGRESS', progress: 50 });

      const result = await service.updateProgress('t1', 'ai1', 50, 'owner-1');

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockAudit.ingest).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_PROGRESS', changedBy: 'owner-1' }),
      );
    });

    it('forbids a non-owner from updating progress', async () => {
      mockPrisma.surveyActionItem.findFirst.mockResolvedValue({
        id: 'ai1',
        assigneeId: 'owner-1',
        status: 'PENDING',
        progress: 0,
        survey: { title: 'Pulse' },
      });

      await expect(service.updateProgress('t1', 'ai1', 80, 'intruder')).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.surveyActionItem.update).not.toHaveBeenCalled();
    });
  });

  describe('overdue detection', () => {
    it('flags open items past their due date, never completed ones', async () => {
      mockPrisma.engagementSurvey.findFirst.mockResolvedValue({ id: 's1', tenantId: 't1', title: 'Pulse' });
      mockPrisma.surveyActionItem.findMany.mockResolvedValue([
        { id: 'ai-late', status: 'IN_PROGRESS', progress: 30, dueDate: new Date(Date.now() - 3 * 86400000) },
        { id: 'ai-ok', status: 'PENDING', progress: 0, dueDate: new Date(Date.now() + 5 * 86400000) },
        { id: 'ai-done', status: 'COMPLETED', progress: 100, dueDate: new Date(Date.now() - 30 * 86400000) },
      ]);

      const items = await service.getActionItems('t1', 's1');

      expect(items.find((i: any) => i.id === 'ai-late')?.isOverdue).toBe(true);
      expect(items.find((i: any) => i.id === 'ai-ok')?.isOverdue).toBe(false);
      expect(items.find((i: any) => i.id === 'ai-done')?.isOverdue).toBe(false);
    });
  });

  describe('listActionItems', () => {
    it('scopes by tenant and returns pagination metadata', async () => {
      mockPrisma.surveyActionItem.findMany.mockResolvedValue([
        { id: 'ai1', status: 'PENDING', progress: 0, dueDate: new Date(Date.now() + 86400000) },
      ]);
      mockPrisma.surveyActionItem.count.mockResolvedValue(1);

      const result = await service.listActionItems('t1', { page: 1, limit: 20 }, 'viewer-1');

      expect(mockPrisma.surveyActionItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ survey: { tenantId: 't1', deletedAt: null } }),
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    });

    it('overdueOnly filters to past-due open items', async () => {
      mockPrisma.surveyActionItem.findMany.mockResolvedValue([]);
      mockPrisma.surveyActionItem.count.mockResolvedValue(0);

      await service.listActionItems('t1', { overdueOnly: true }, 'viewer-1');

      expect(mockPrisma.surveyActionItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: expect.any(Date) },
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          }),
        }),
      );
    });

    it('mineOnly restricts the result set to the viewer', async () => {
      mockPrisma.surveyActionItem.findMany.mockResolvedValue([]);
      mockPrisma.surveyActionItem.count.mockResolvedValue(0);

      await service.listActionItems('t1', { mineOnly: true }, 'viewer-1');

      expect(mockPrisma.surveyActionItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ assigneeId: 'viewer-1' }) }),
      );
    });
  });

  describe('getMyActionItems', () => {
    it('returns only items owned by the user, tenant-scoped', async () => {
      mockPrisma.surveyActionItem.findMany.mockResolvedValue([]);

      await service.getMyActionItems('t1', 'owner-1');

      expect(mockPrisma.surveyActionItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: 'owner-1',
            deletedAt: null,
            survey: { tenantId: 't1', deletedAt: null },
          }),
        }),
      );
    });
  });

  describe('getActionItemSummary', () => {
    it('aggregates completion rate, average progress and overdue count', async () => {
      mockPrisma.surveyActionItem.findMany.mockResolvedValue([
        { id: 'a', status: 'COMPLETED', progress: 100, dueDate: new Date(), assigneeId: 'u1' },
        { id: 'b', status: 'IN_PROGRESS', progress: 50, dueDate: new Date(Date.now() - 86400000), assigneeId: 'u1' },
        { id: 'c', status: 'PENDING', progress: 0, dueDate: new Date(Date.now() + 86400000), assigneeId: 'u2' },
        { id: 'd', status: 'CANCELLED', progress: 0, dueDate: new Date(), assigneeId: 'u2' },
      ]);

      const summary = await service.getActionItemSummary('t1');

      expect(summary.total).toBe(4);
      expect(summary.byStatus).toMatchObject({ COMPLETED: 1, IN_PROGRESS: 1, PENDING: 1, CANCELLED: 1 });
      expect(summary.overdue).toBe(1);
      expect(summary.completionRate).toBe(25);
      expect(summary.averageProgress).toBe(38);
      expect(summary.byAssignee[0]).toMatchObject({ assigneeId: 'u1', total: 2, completed: 1, overdue: 1 });
    });
  });

  describe('sendOverdueReminders', () => {
    it('notifies owners of overdue items and records reminderSentAt', async () => {
      mockPrisma.surveyActionItem.findMany.mockResolvedValue([
        {
          id: 'ai-late',
          assigneeId: 'u1',
          title: 'Perbaiki engagement',
          progress: 20,
          dueDate: new Date('2026-01-01'),
          surveyId: 's1',
          survey: { title: 'ENPS 2026' },
        },
      ]);
      mockPrisma.surveyActionItem.update.mockResolvedValue({});

      const sent = await service.sendOverdueReminders('t1');

      expect(sent).toBe(1);
      expect(mockNotification.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', templateKey: 'survey_action_item_overdue' }),
      );
      expect(mockPrisma.surveyActionItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ai-late' }, data: { reminderSentAt: expect.any(Date) } }),
      );
    });
  });

  describe('deleteActionItem', () => {
    it('soft-deletes and audits the action item', async () => {
      mockPrisma.surveyActionItem.findFirst.mockResolvedValue({ id: 'ai1', survey: { title: 'Pulse' } });
      mockPrisma.surveyActionItem.update.mockResolvedValue({ id: 'ai1' });

      const result = await service.deleteActionItem('t1', 'ai1', 'actor1');

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.surveyActionItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
      );
      expect(mockAudit.ingest).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'survey_action_item', action: 'DELETE' }),
      );
    });

    it('throws NotFound when the item belongs to another tenant', async () => {
      mockPrisma.surveyActionItem.findFirst.mockResolvedValue(null);
      await expect(service.deleteActionItem('t1', 'nope', 'actor1')).rejects.toThrow(NotFoundException);
    });
  });
});

