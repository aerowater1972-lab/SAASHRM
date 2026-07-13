import { Test, TestingModule } from '@nestjs/testing';
import { NotificationJobHandler } from './notification.handler';
import { NotificationService } from '../../notification/notification.service';
import { Job } from '../job-handler.interface';

describe('NotificationJobHandler', () => {
  let handler: NotificationJobHandler;

  const mockNotificationService = {
    send: jest.fn().mockResolvedValue(undefined),
    buildFromEvent: jest.fn(),
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
});
