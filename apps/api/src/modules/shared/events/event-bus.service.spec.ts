import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from './event-bus.service';
import { PgJobQueueService } from './pg-job-queue.service';
import { OutboxService } from './outbox.service';

describe('EventBusService', () => {
  let service: EventBusService;
  let jobQueue: any;

  const mockJobQueue = {
    add: jest.fn(),
    addMany: jest.fn(),
  };

  const mockOutbox = {
    save: jest.fn(),
    relayBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: PgJobQueueService, useValue: mockJobQueue },
        { provide: OutboxService, useValue: mockOutbox },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    jobQueue = module.get(PgJobQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should publish a single event to the job queue', async () => {
      const event = {
        name: 'EmployeeCreated',
        aggregateId: 'emp-1',
        aggregateType: 'Employee',
        payload: { fullName: 'John Doe' },
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      await service.publish(event);

      expect(jobQueue.add).toHaveBeenCalledWith(
        'events',
        'EmployeeCreated',
        expect.objectContaining({
          name: 'EmployeeCreated',
          aggregateId: 'emp-1',
          payload: { fullName: 'John Doe' },
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('publishMany', () => {
    it('should publish multiple events to the job queue', async () => {
      const events = [
        {
          name: 'EmployeeCreated',
          aggregateId: 'emp-1',
          aggregateType: 'Employee',
          payload: { fullName: 'John' },
        },
        {
          name: 'EmployeeUpdated',
          aggregateId: 'emp-1',
          aggregateType: 'Employee',
          payload: { fullName: 'John Updated' },
        },
      ];

      await service.publishMany(events);

      expect(jobQueue.addMany).toHaveBeenCalledWith(
        'events',
        expect.arrayContaining([
          expect.objectContaining({ name: 'EmployeeCreated' }),
          expect.objectContaining({ name: 'EmployeeUpdated' }),
        ]),
      );
    });
  });
});
