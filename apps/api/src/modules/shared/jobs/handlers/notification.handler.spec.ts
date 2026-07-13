import { Test, TestingModule } from '@nestjs/testing';
import { NotificationJobHandler } from './notification.handler';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { Job } from '../job-handler.interface';

describe('NotificationJobHandler', () => {
  let handler: NotificationJobHandler;

  const mockNotificationService = {
    send: jest.fn().mockResolvedValue(undefined),
    buildFromEvent: jest.fn(),
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
    },
  };

  const baseJob: Job = {
    id: 'job-1',
    queue: 'events',
    name: 'test.event',
    payload: { tenantId: 'default', aggregateId: 'agg-1', aggregateType: 'Test' },
    status: 'PENDING' as any,
    retries: 0,
    maxRetries: 3,
    priority: 0,
    scheduledAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationJobHandler,
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    handler = module.get<NotificationJobHandler>(NotificationJobHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create notification for resignation.requested', async () => {
    const job = { ...baseJob, name: 'resignation.requested', payload: { ...baseJob.payload, employeeId: 'emp-1' } };
    mockNotificationService.buildFromEvent.mockReturnValue({ title: 'Resignation Requested', body: 'An employee has submitted a resignation request.' });
    await handler.handle(job);

    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Resignation Requested', templateKey: 'resignation.requested' }),
    );
  });

  it('should create notification for application.status.updated', async () => {
    const job = { ...baseJob, name: 'application.status.updated', payload: { ...baseJob.payload, newStatus: 'APPROVED' } };
    mockNotificationService.buildFromEvent.mockReturnValue({ title: 'Application Status Updated', body: 'Application status changed to APPROVED.' });
    await handler.handle(job);

    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Application Status Updated', body: 'Application status changed to APPROVED.' }),
    );
  });

  it('should create notification for candidate.converted', async () => {
    const job = { ...baseJob, name: 'candidate.converted', payload: { ...baseJob.payload, employeeCode: 'EMP010' } };
    mockNotificationService.buildFromEvent.mockReturnValue({ title: 'Candidate Converted to Employee', body: 'Candidate hired as employee EMP010.' });
    await handler.handle(job);

    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Candidate Converted to Employee', body: 'Candidate hired as employee EMP010.' }),
    );
  });

  it('should skip unknown event types', async () => {
    const job = { ...baseJob, name: 'unknown.event' };
    mockNotificationService.buildFromEvent.mockReturnValue(null);
    await handler.handle(job);

    expect(mockNotificationService.send).not.toHaveBeenCalled();
  });

  it('resolves userId via employeeId (FK-safe) instead of writing the Employee UUID', async () => {
    const job = {
      ...baseJob,
      name: 'expense.claim.approved',
      payload: { ...baseJob.payload, employeeId: 'emp-uuid-123', claimId: 'c1', amount: 500, category: 'TRAVEL' },
    };
    mockNotificationService.buildFromEvent.mockReturnValue({ title: 'Expense Claim Approved', body: 'Claim approved.' });
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-resolved-1' });

    await handler.handle(job);

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp-uuid-123' } }),
    );
    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-resolved-1', employeeId: 'emp-uuid-123' }),
    );
    // Must NOT write the Employee UUID straight into userId (the old FK-violating behavior)
    const sent = mockNotificationService.send.mock.calls[0][0];
    expect(sent.userId).not.toBe('emp-uuid-123');
  });

  it('skips in-app Notification when no user resolves but still sends ESS payload', async () => {
    const job = {
      ...baseJob,
      name: 'attendance.period.closed',
      payload: { ...baseJob.payload, employeeId: 'emp-orphan' },
    };
    mockNotificationService.buildFromEvent.mockReturnValue({ title: 'Attendance Period Closed', body: 'Period closed.' });
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await handler.handle(job);

    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined, employeeId: 'emp-orphan' }),
    );
  });
});
