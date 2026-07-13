import { Test, TestingModule } from '@nestjs/testing';
import { AuditEventService } from './audit-event.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('AuditEventService', () => {
  let service: AuditEventService;
  let prisma: any;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditEventService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditEventService>(AuditEventService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      const event = {
        action: 'CREATE',
        entity: 'Employee',
        entityId: 'emp-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        changes: { old: null, new: { name: 'John' } },
      };

      await service.log(event);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          module: 'Employee',
          entity: 'Employee',
          entityId: 'emp-1',
          action: 'CREATE',
          changedBy: 'user-1',
          oldValue: undefined,
          newValue: { name: 'John' },
        },
      });
    });

    it('should handle nested entity module extraction', async () => {
      const event = {
        action: 'UPDATE',
        entity: 'payroll.Payslip',
        entityId: 'payslip-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        changes: { old: { amount: 100 }, new: { amount: 200 } },
        metadata: { reason: 'correction' },
      };

      await service.log(event);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          module: 'payroll',
          entity: 'payroll.Payslip',
          entityId: 'payslip-1',
          action: 'UPDATE',
          changedBy: 'user-1',
          oldValue: { amount: 100 },
          newValue: { amount: 200 },
        },
      });
    });

    it('should store metadata when changes.new not available', async () => {
      const event = {
        action: 'LOGIN',
        entity: 'Session',
        entityId: 'session-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        metadata: { ip: '192.168.1.1' },
      };

      await service.log(event);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          module: 'Session',
          entity: 'Session',
          entityId: 'session-1',
          action: 'LOGIN',
          changedBy: 'user-1',
          oldValue: undefined,
          newValue: { ip: '192.168.1.1' },
        },
      });
    });
  });

  describe('logMany', () => {
    it('should create multiple audit log entries', async () => {
      const events = [
        {
          action: 'CREATE',
          entity: 'Employee',
          entityId: 'emp-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          changes: { new: { name: 'John' } },
        },
        {
          action: 'DELETE',
          entity: 'Employee',
          entityId: 'emp-2',
          tenantId: 'tenant-1',
          userId: 'user-1',
        },
      ];

      await service.logMany(events);

      expect(prisma.auditLog.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ entityId: 'emp-1', action: 'CREATE' }),
          expect.objectContaining({ entityId: 'emp-2', action: 'DELETE' }),
        ],
      });
    });
  });
});
