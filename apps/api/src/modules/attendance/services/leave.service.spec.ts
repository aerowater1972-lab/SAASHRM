import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { PayrollAdjustmentService } from '@modules/payroll/services/payroll-adjustment.service';

describe('LeaveService - Addendum Serikat Pekerja (BR-01/BR-02)', () => {
  let service: LeaveService;

  const mockPrisma = {
    leaveType: { findFirst: jest.fn(), findMany: jest.fn() },
    leaveRequest: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    leaveBalance: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    featureFlag: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    attendanceRecord: { upsert: jest.fn() },
    employee: { findMany: jest.fn() },
    tenant: { findMany: jest.fn() },
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
      mockPrisma.leaveType.findMany.mockResolvedValue([{ id: 'lt-sick' }]);
      mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
      const r = await service.getSickPayStatus('t1', 'emp-1', d('2026-09-01'), d('2026-09-30'));
      expect(r.priorSickDays).toBe(0);
      expect(r.rangeSickDays).toBe(0);
      expect(r.brackets).toEqual([{ fromMonth: 0, toMonth: 0, percent: 100 }]);
    });
    it('riwayat 150 hari + 30 hari berjalan -> tetap 75% (bln 6-7)', async () => {
      mockPrisma.leaveType.findMany.mockResolvedValue([{ id: 'lt-sick' }]);
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
      mockPrisma.leaveType.findMany.mockResolvedValue([{ id: 'lt-sick' }]);
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
    it('tanpa jenis SL/CS -> TYPE_NOT_CONFIGURED', async () => {
      mockPrisma.leaveType.findMany.mockResolvedValue([]);
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

  describe('approveRequest segregation of duties', () => {
    const req = {
      id: 'req-1', employeeId: 'emp-1', leaveTypeId: 'lt-annual',
      startDate: new Date('2026-10-05'), endDate: new Date('2026-10-06'),
      totalDays: 2, reason: 'x', isUrgent: false, escalated: false, status: 'PENDING',
      leaveType: { isBalanceDeducting: true },
    };
    beforeEach(() => {
      mockPrisma.leaveRequest.findFirst.mockResolvedValue(req);
      mockPrisma.leaveBalance.findUnique.mockResolvedValue({ id: 'bal-1' });
      mockWorkflow.transition.mockReturnValue({ to: 'APPROVED' });
      mockPrisma.leaveRequest.update.mockImplementation(({ data }) => Promise.resolve({ ...req, ...data }));
      mockPrisma.attendanceRecord.upsert.mockResolvedValue({});
    });
    it('menolak bila pengaju menyetujui sendiri', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: 'emp-1' });
      await expect(service.approveRequest('t1', 'req-1', 'user-1')).rejects.toThrow('sendiri');
      expect(mockPrisma.leaveRequest.update).not.toHaveBeenCalled();
    });
    it('mengizinkan approver berbeda dan memindahkan saldo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: 'mgr-1' });
      const res = await service.approveRequest('t1', 'req-1', 'user-2');
      expect(res.status).toBe('APPROVED');
      expect(mockPrisma.leaveBalance.update).toHaveBeenCalled();
    });
  });

  describe('accrueAnnualEntitlement', () => {
    const asOf = new Date('2026-09-15T00:00:00Z');
    beforeEach(() => {
      mockPrisma.leaveType.findFirst.mockResolvedValue({ id: 'lt-al' });
    });
    it('memberi 12 hari pada yang >= 12 bulan dan belum punya saldo', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: 'emp-old', startDate: new Date('2020-01-10') },
      ]);
      mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
      mockPrisma.leaveBalance.create.mockResolvedValue({ id: 'bal-1' });
      const r = await service.accrueAnnualEntitlement('t1', asOf);
      expect(r).toEqual({ granted: 1, skipped: 0 });
      expect(mockPrisma.leaveBalance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalEntitled: 12, year: 2026 }),
        }),
      );
    });
    it('melewatkan yang < 12 bulan dan yang sudah punya saldo', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: 'emp-new', startDate: new Date('2026-03-01') },
        { id: 'emp-has', startDate: new Date('2020-01-10') },
      ]);
      mockPrisma.leaveBalance.findUnique.mockImplementation(({ where }) =>
        where.employeeId_leaveTypeId_year.employeeId === 'emp-has'
          ? Promise.resolve({ id: 'bal-x' })
          : Promise.resolve(null),
      );
      const r = await service.accrueAnnualEntitlement('t1', asOf);
      expect(r).toEqual({ granted: 0, skipped: 2 });
      expect(mockPrisma.leaveBalance.create).not.toHaveBeenCalled();
    });
    it('tidak melakukan apa-apa tanpa jenis AL', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue(null);
      const r = await service.accrueAnnualEntitlement('t1', asOf);
      expect(r).toEqual({ granted: 0, skipped: 0 });
      expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
    });
  });

  describe('accrueAnnualEntitlement', () => {
    const asOf = new Date('2026-09-15T00:00:00Z');
    beforeEach(() => {
      mockPrisma.leaveType.findFirst.mockResolvedValue({ id: 'lt-al' });
    });
    it('memberi 12 hari pada yang >= 12 bulan dan belum punya saldo', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: 'emp-old', startDate: new Date('2020-01-10') },
      ]);
      mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
      mockPrisma.leaveBalance.create.mockResolvedValue({ id: 'bal-1' });
      const r = await service.accrueAnnualEntitlement('t1', asOf);
      expect(r).toEqual({ granted: 1, skipped: 0 });
      expect(mockPrisma.leaveBalance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalEntitled: 12, year: 2026 }),
        }),
      );
    });
    it('melewatkan yang < 12 bulan dan yang sudah punya saldo', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: 'emp-new', startDate: new Date('2026-03-01') },
        { id: 'emp-has', startDate: new Date('2020-01-10') },
      ]);
      mockPrisma.leaveBalance.findUnique.mockImplementation(({ where }) =>
        where.employeeId_leaveTypeId_year.employeeId === 'emp-has'
          ? Promise.resolve({ id: 'bal-x' })
          : Promise.resolve(null),
      );
      const r = await service.accrueAnnualEntitlement('t1', asOf);
      expect(r).toEqual({ granted: 0, skipped: 2 });
      expect(mockPrisma.leaveBalance.create).not.toHaveBeenCalled();
    });
    it('tidak melakukan apa-apa tanpa jenis AL', async () => {
      mockPrisma.leaveType.findFirst.mockResolvedValue(null);
      const r = await service.accrueAnnualEntitlement('t1', asOf);
      expect(r).toEqual({ granted: 0, skipped: 0 });
      expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
    });
    it('mencari jenis cuti tahunan AL maupun CT (multi-tenant)', async () => {
      mockPrisma.employee.findMany.mockResolvedValue([]);
      await service.accrueAnnualEntitlement('t1', asOf);
      expect(mockPrisma.leaveType.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ code: { in: ['AL', 'CT'] } }) }),
      );
    });
  });

  describe('findOneRequestScoped (ESS privacy)', () => {
    it('pemilik boleh buka detailnya', async () => {
      mockPrisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'req-1', employeeId: 'emp-1', leaveType: {},
      });
      const r = await service.findOneRequestScoped('t1', 'req-1', 'emp-1');
      expect(r.id).toBe('req-1');
    });
    it('orang lain -> Forbidden', async () => {
      mockPrisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'req-1', employeeId: 'emp-1', leaveType: {},
      });
      await expect(service.findOneRequestScoped('t1', 'req-1', 'emp-9')).rejects.toThrow('milik Anda');
    });
  });
});

describe('LeaveService - potongan upah sakit otomatis (UU Art 93)', () => {
  let service: LeaveService;

  const mockPrisma = {
    leaveType: { findFirst: jest.fn(), findMany: jest.fn() },
    leaveRequest: { findMany: jest.fn() },
    payrollComponent: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const mockEmployeeService = {
    findById: jest.fn().mockResolvedValue({
      id: 'emp-1', employments: [{ grade: { level: 8 } }],
    }),
  };
  const mockAdjustments = { create: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: {} },
        { provide: EventBusService, useValue: {} },
        { provide: PayrollAdjustmentService, useValue: mockAdjustments },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    // jenis SL ada; belum ada riwayat sakit -> bracket 100% untuk request pendek
    mockPrisma.leaveType.findMany.mockResolvedValue([{ id: 'lt-sl', code: 'SL' }]);
    mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  it('tanpa potongan bila masih bracket 100% (sakit pendek)', async () => {
    const res = await service.postSickPayDeduction('t1', {
      id: 'req-1', employeeId: 'emp-1',
      startDate: new Date('2026-09-01'), endDate: new Date('2026-09-03'),
      leaveType: { code: 'SL' },
    });
    expect(res).toEqual({ days: 3, unpaidAmount: 0, posted: false });
    expect(mockAdjustments.create).not.toHaveBeenCalled();
  });

  it('memposting DEDUCTION untuk hari di bracket 75% (150 hari sakit sblmnya)', async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([
      { startDate: new Date('2026-01-01'), endDate: new Date('2026-05-30') }, // 150 hari
    ]);
    const res: any = await service.postSickPayDeduction('t1', {
      id: 'req-2', employeeId: 'emp-1',
      startDate: new Date('2026-09-01'), endDate: new Date('2026-09-02'),
      leaveType: { code: 'SL' },
    });
    // 150 hari sblmnya -> bulan ke-5 (indeks 5) = 75% -> unpaid 25% x 2 hari
    const daily = 8000000 / 30;
    expect(res.unpaidAmount).toBe(Math.round(daily * 0.25 * 2));
    expect(res.posted).toBe(true);
    expect(mockAdjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DEDUCTION', sourceEvent: 'SICK_PAY_UNPAID', referenceId: 'req-2' }),
    );
  });

  it('melewatkan jenis non-sakit', async () => {
    const res = await service.postSickPayDeduction('t1', {
      id: 'req-3', employeeId: 'emp-1',
      startDate: new Date('2026-09-01'), endDate: new Date('2026-09-03'),
      leaveType: { code: 'AL' },
    });
    expect(res).toBeNull();
  });

  it('kode CS (tenant demo) memicu skema yang sama dengan SL', async () => {
    const res: any = await service.postSickPayDeduction('t1', {
      id: 'req-4', employeeId: 'emp-1',
      startDate: new Date('2026-09-01'), endDate: new Date('2026-09-02'),
      leaveType: { code: 'CS' },
    });
    expect(res).toEqual({ days: 2, unpaidAmount: 0, posted: false });
  });
});
