import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EngagementSurveyService } from './engagement-survey.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { NotificationService } from '@modules/shared/notification/notification.service';

describe('EngagementSurveyService', () => {
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
      update: jest.fn(),
      findMany: jest.fn(),
    },
    employee: { findMany: jest.fn() },
    employment: { findMany: jest.fn() },
    department: { findMany: jest.fn() },
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

  it('create: menyimpan survei baru + audit CREATE (success path)', async () => {
    const survey = { id: 's1', tenantId: 't1', title: 'Pulse Q3' };
    mockPrisma.engagementSurvey.create.mockResolvedValue(survey);

    const result = await service.create(
      't1',
      {
        title: 'Pulse Q3',
        type: 'PULSE',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      } as any,
      'actor1',
    );

    expect(result).toEqual(survey);
    expect(mockPrisma.engagementSurvey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't1', title: 'Pulse Q3', createdBy: 'actor1' }),
      }),
    );
    expect(mockAudit.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', entityId: 's1', action: 'CREATE' }),
    );
  });

  it('findOne: melempar NotFoundException bila survei tidak ada', async () => {
    mockPrisma.engagementSurvey.findFirst.mockResolvedValue(null);

    await expect(service.findOne('t1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('findAll/findOne: selalu memfilter tenantId (tenant-scoping)', async () => {
    mockPrisma.engagementSurvey.findMany.mockResolvedValue([]);
    mockPrisma.engagementSurvey.count.mockResolvedValue(0);
    mockPrisma.engagementSurvey.findFirst.mockResolvedValue({ id: 's1', tenantId: 't1' });

    await service.findAll('t1', {});
    expect(mockPrisma.engagementSurvey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1' }),
      }),
    );
    expect(mockPrisma.engagementSurvey.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1' }),
      }),
    );

    await service.findOne('t1', 's1');
    expect(mockPrisma.engagementSurvey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 's1', tenantId: 't1' }),
      }),
    );
  });

  it('update: survei DRAFT bisa diubah + audit UPDATE', async () => {
    mockPrisma.engagementSurvey.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      status: 'DRAFT',
      isAnonymous: true,
    });
    mockPrisma.engagementSurvey.update.mockResolvedValue({ id: 's1', title: 'Judul Baru' });

    const result = await service.update('t1', 's1', { title: 'Judul Baru' }, 'actor1');

    expect(mockPrisma.engagementSurvey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ title: 'Judul Baru' }),
      }),
    );
    expect(mockAudit.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', entityId: 's1', action: 'UPDATE' }),
    );
    expect(result).toMatchObject({ id: 's1', title: 'Judul Baru' });
  });

  it('update: menolak survei non-DRAFT (BadRequest)', async () => {
    mockPrisma.engagementSurvey.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      status: 'ACTIVE',
      isAnonymous: true,
    });

    await expect(service.update('t1', 's1', { title: 'X' }, 'actor1')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.engagementSurvey.update).not.toHaveBeenCalled();
  });

  it('submitResponse: menyimpan jawaban survei ACTIVE yang sedang dibuka', async () => {
    mockPrisma.engagementSurvey.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      status: 'ACTIVE',
      isAnonymous: true,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      questions: [{ id: 'q1' }],
    });
    mockPrisma.surveyResponse.createMany.mockResolvedValue({ count: 1 });

    const result = await service.submitResponse(
      't1',
      { surveyId: 's1', responses: [{ questionId: 'q1', answerValue: '5' }] },
      'actor1',
    );

    expect(result).toEqual({ success: true });
    expect(mockPrisma.surveyResponse.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ surveyId: 's1', questionId: 'q1', answerValue: '5' }),
        ]),
      }),
    );
    expect(mockAudit.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', action: 'SUBMIT' }),
    );
  });

  it('submitResponse: menolak questionId yang bukan milik survei (BadRequest)', async () => {
    mockPrisma.engagementSurvey.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      status: 'ACTIVE',
      isAnonymous: true,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      questions: [{ id: 'q1' }],
    });

    await expect(
      service.submitResponse(
        't1',
        { surveyId: 's1', responses: [{ questionId: 'q-asing', answerValue: '5' }] },
        'actor1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.surveyResponse.createMany).not.toHaveBeenCalled();
  });

  it('delete: soft-delete (deletedAt) + audit DELETE', async () => {
    mockPrisma.engagementSurvey.findFirst.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      status: 'DRAFT',
    });
    mockPrisma.engagementSurvey.update.mockResolvedValue({ id: 's1' });

    await service.delete('t1', 's1', 'actor1');

    expect(mockPrisma.engagementSurvey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 's1', tenantId: 't1' }),
      }),
    );
    expect(mockPrisma.engagementSurvey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
    expect(mockAudit.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', entityId: 's1', action: 'DELETE' }),
    );
  });
});
