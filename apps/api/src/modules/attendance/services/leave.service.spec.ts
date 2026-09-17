import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';

describe('LeaveService - Addendum Serikat Pekerja (BR-01/BR-02)', () => {
  let service: LeaveService;

  const mockPrisma = {
    leaveType: { findFirst: jest.fn() },
    leaveRequest: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    leaveBalance: { findUnique: jest.fn(), update: jest.fn() },
    featureFlag: { findFirst: jest.fn() },
    attendanceRecord: { upsert: jest.fn() },
  };

  const mockEmployeeService = { findById: jest.fn() };
  const mockWorkflow = { transition: jest.fn() };
  const mockEventBus = { publish: jest.fn() };

  const unionLeaveType = {
    id: 'lt-union',
    tenantId: 'nusantara',
    name: 'Izin Kegiatan Serikat',
    code: 'IKS',
    isActive: true,
    isBalanceDeducting: false,
    isUnionActivity: true,
    sameDayApproval: false,
  };

  const baseDto = {
    leaveTypeId: 'lt-union',
    startDate: '2026-08-10',
    endDate: '2026-08-10',
    reason: 'Kongres serikat',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
  });

  afterEach(() => jest.clearAllMocks());

  it('BR-02: rejects union leave when labor_union feature flag is OFF', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue(null);

    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(/labor_union/);
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it('BR-01: rejects union leave when employee is not an OFFICER', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'MEMBER' });

    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(/officer/i);
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it('BR-01: rejects union leave when employee unionStatus is NONE', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'NONE' });

    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it('BR-01: allows union leave when flag ON and employee is OFFICER (non-deducting, no balance touched)', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'OFFICER' });
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: 'req-1', leaveTypeId: 'lt-union' });

    const result = await service.createLeaveRequest('nusantara', 'emp-1', baseDto as any);

    expect(result).toEqual(expect.objectContaining({ id: 'req-1' }));
    expect(mockPrisma.leaveRequest.create).toHaveBeenCalled();
    expect(mockPrisma.leaveBalance.findUnique).not.toHaveBeenCalled();
  });

  it('does not apply union checks to non-union leave types', async () => {
    const normalLeave = { ...unionLeaveType, id: 'lt-annual', code: 'CT', isUnionActivity: false, isBalanceDeducting: true };
    mockPrisma.leaveType.findFirst.mockResolvedValue(normalLeave);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({ totalEntitled: 12, carryForward: 0, totalUsed: 0, totalPending: 0 });
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: 'req-2' });

    await service.createLeaveRequest('nusantara', 'emp-1', { ...baseDto, leaveTypeId: 'lt-annual' } as any);

    expect(mockPrisma.featureFlag.findFirst).not.toHaveBeenCalled();
    expect(mockEmployeeService.findById).not.toHaveBeenCalled();
  });

  describe('getLongLeaveStatus (UU 13/2003 Art 79)', () => {
    it('eligible bila masa kerja >= 6 tahun, sisa = 60 - terpakai', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', startDate: new Date('2016-02-01') });
      mockPrisma.leaveType.findFirst.mockResolvedValue({ id: 'lt-long' });
      mockPrisma.leaveRequest.findMany.mockResolvedValue([{ totalDays: 30 }]);

      const r = await service.getLongLeaveStatus('nusantara', 'emp-1');

      expect(r.eligible).toBe(true);
      expect(r).toEqual(expect.objectContaining({ yearsOfService: expect.any(Number), entitledDays: 60, usedDays: 30, remainingDays: 30 }));
      expect(r.yearsOfService).toBeGreaterThanOrEqual(6);
    });

    it('tidak eligible bila < 6 tahun', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-2', startDate: new Date('2024-01-15') });

      const r = await service.getLongLeaveStatus('nusantara', 'emp-2');

      expect(r.eligible).toBe(false);
      expect((r as any).reason).toBe('UNDER_6_YEARS');
      expect(mockPrisma.leaveType.findFirst).not.toHaveBeenCalled();
    });

    it('eligible tapi beri tahu bila jenis LONG belum dikonfigurasi', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', startDate: new Date('2016-02-01') });
      mockPrisma.leaveType.findFirst.mockResolvedValue(null);

      const r = await service.getLongLeaveStatus('nusantara', 'emp-1');

      expect(r.eligible).toBe(true);
      expect((r as any).reason).toBe('TYPE_NOT_CONFIGURED');
    });
  });

  describe('getSickPayStatus (UU 13/2003 Art 93)', () => {
    const d = (s: string) => new Date(s + 'T00:00:00Z');
    it.each([[0, 100], [3, 100], [4, 75], [7, 75], [8, 50], [11, 50], [12, 25], [20, 25]])(
      'bulan %i -> %i persen', (m, p) => {
        expect(service.sickPayPercentForMonth(m)).toBe(p);
      },
    );
    it('rentang tanpa riwayat: bracket 100% dari bulan 0', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue({ id: 'lt-sick' });
      mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
      const r = await service.getSickPayStatus('t1', 'emp-1', d('2026-09-01'), d('2026-09-30'));
      expect(r.priorSickDays).toBe(0);
      expect(r.rangeSickDays).toBe(0);
      expect(r.brackets).toEqual([{ fromMonth: 0, toMonth: 0, percent: 100 }]);
    });
    it('riwayat 150 hari + 30 hari berjalan -> tetap 75% (bln 6-7)', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue({ id: 'lt-sick' });
      mockPrisma.leaveRequest.findMany.mockResolvedValue([
        { startDate: d('2026-01-01'), endDate: d('2026-05-30') },
        { startDate: d('2026-09-01'), endDate: d('2026-09-30') },
      ]);
      const r = await service.getSickPayStatus('t1', 'emp-1', d('2026-09-01'), d('2026-09-30'));
      expect(r.priorSickDays).toBe(150);
      expect(r.rangeSickDays).toBe(30);
      expect(r.brackets).toEqual([{ fromMonth: 5, toMonth: 6, percent: 75 }]);
    });
    it('melewati ambang 8 bulan -> menyentuh 50%', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue({ id: 'lt-sick' });
      mockPrisma.leaveRequest.findMany.mockResolvedValue([
        { startDate: d('2026-01-01'), endDate: d('2026-07-29') },
        { startDate: d('2026-09-01'), endDate: d('2026-09-30') },
      ]);
      const r = await service.getSickPayStatus('t1', 'emp-1', d('2026-09-01'), d('2026-09-30'));
      expect(r.priorSickDays).toBe(210);
      expect(r.brackets).toEqual([
        { fromMonth: 7, toMonth: 7, percent: 75 },
        { fromMonth: 8, toMonth: 8, percent: 50 },
      ]);
    });
    it('tanpa jenis SL -> TYPE_NOT_CONFIGURED', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue(null);
      const r = await service.getSickPayStatus('t1', 'emp-1', d('2026-09-01'), d('2026-09-30'));
      expect(r.reason).toBe('TYPE_NOT_CONFIGURED');
    });
  });

  describe('document and gender enforcement', () => {
    const docType = { id: 'lt-ckg', isBalanceDeducting: false, requiresDocument: true, genderRestriction: 'FEMALE' };
    const dto = { leaveTypeId: 'lt-ckg', startDate: '2026-08-10', endDate: '2026-08-10', reason: 'CKG' };
    it('menolak tanpa documentUrl bila requiresDocument', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue(docType);
      await expect(service.createLeaveRequest('t1', 'emp-1', dto)).rejects.toThrow(/dokumen/i);
      expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
    });
    it('menolak gender tak sesuai (MATL/CKG untuk FEMALE)', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue(docType);
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'NONE', gender: 'MALE' });
      await expect(
        service.createLeaveRequest('t1', 'emp-1', { ...dto, documentUrl: 'http://x/doc.pdf' }),
      ).rejects.toThrow(/gender/i);
    });
    it('lolos bila dokumen ada dan gender sesuai', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue(docType);
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'NONE', gender: 'FEMALE' });
      mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
      mockPrisma.leaveRequest.create.mockResolvedValue({ id: 'req-doc' });
      const r = await service.createLeaveRequest('t1', 'emp-1', { ...dto, documentUrl: 'http://x/doc.pdf' });
      expect(r.id).toBe('req-doc');
    });
    it('approve jenis non-deducting TIDAK menyentuh saldo (BR-11)', async () => {
      const req = {
        id: 'req-ck', employeeId: 'emp-1', leaveTypeId: 'lt-ckg',
        startDate: new Date('2026-08-10'), endDate: new Date('2026-08-10'),
        totalDays: 1, reason: 'x', isUrgent: false, escalated: false, status: 'PENDING',
        leaveType: { isBalanceDeducting: false },
      };
      mockPrisma.leaveRequest.findFirst.mockResolvedValue(req);
      mockPrisma.leaveBalance.findUnique.mockResolvedValue({ id: 'bal-1', totalUsed: 0, totalPending: 0 });
      mockWorkflow.transition.mockReturnValue({ to: 'APPROVED' });
      mockPrisma.leaveRequest.update.mockResolvedValue({ ...req, status: 'APPROVED' });
      mockPrisma.attendanceRecord.upsert.mockResolvedValue({});
      await service.approveRequest('t1', 'req-ck', 'mgr-1');
      expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
    });
  });
});
