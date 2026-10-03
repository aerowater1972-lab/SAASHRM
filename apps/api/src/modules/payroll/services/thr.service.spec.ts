import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrService } from './thr.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';

/**
 * ThrService — THR Keagamaan (Permenaker 6/2016):
 * >= 12 bln = 1 bln upah; < 12 bln proporsional; < 1 bln tidak eligible.
 * Upah = gaji pokok + tunjangan FIXED. DueDate otomatis H-7.
 */
describe('ThrService', () => {
  let service: ThrService;
  let prisma: any;

  const mockPrisma = {
    thrRun: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    thrRecord: { upsert: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    payrollComponent: { findMany: jest.fn().mockResolvedValue([]) },
    payrollAdjustment: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const mockEmployeeService = { findActive: jest.fn() };
  const mockAdjustments = { create: jest.fn() };

  const HOLIDAY = new Date('2026-03-20T00:00:00Z'); // Idul Fitri 1447H (contoh)
  const run = { id: 'run-1', tenantId: 't1', status: 'DRAFT', holidayDate: HOLIDAY, holidayName: 'Idul Fitri' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThrService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: PayrollAdjustmentService, useValue: mockAdjustments },
      ],
    }).compile();

    service = module.get<ThrService>(ThrService);
    mockPrisma.thrRun.findFirst.mockResolvedValue(run);
  });

  afterEach(() => jest.clearAllMocks());

  describe('monthsWorked', () => {
    it('>= 12 bulan untuk karyawan lama', () => {
      expect(service.monthsWorked(new Date('2016-02-01'), HOLIDAY)).toBe(12);
    });
    it('proporsional untuk < 12 bulan (masuk 1 Okt -> 5 bln per 20 Mar)', () => {
      expect(service.monthsWorked(new Date('2025-10-01'), HOLIDAY)).toBe(5);
    });
    it('0 bila belum 1 bulan (masuk sesudah 20 Feb)', () => {
      expect(service.monthsWorked(new Date('2026-03-01'), HOLIDAY)).toBe(0);
    });
    it('0 bila startDate kosong/invalid', () => {
      expect(service.monthsWorked(null, HOLIDAY)).toBe(0);
    });
  });

  describe('createRun', () => {
    it('menetapkan dueDate H-7 dari hari raya', async () => {
      mockPrisma.thrRun.create.mockResolvedValue({ id: 'run-1' });
      await service.createRun('t1', { name: 'THR', holidayName: 'Idul Fitri', holidayDate: '2026-03-20' } as any);
      const data = mockPrisma.thrRun.create.mock.calls[0][0].data;
      expect(data.dueDate).toEqual(new Date('2026-03-13T00:00:00Z'));
    });
  });

  describe('calculateRun', () => {
    it('1 bulan upah penuh untuk >= 12 bulan', async () => {
      mockEmployeeService.findActive.mockResolvedValue([
        { id: 'emp-1', startDate: new Date('2016-02-01'), employments: [{ grade: { level: 8 } }] },
      ]);
      await service.calculateRun('t1', 'run-1');
      const data = mockPrisma.thrRecord.upsert.mock.calls[0][0];
      expect(data.create.monthsWorked).toBe(12);
      expect(Number(data.create.amount)).toBe(8000000);
    });

    it('proporsional untuk masa kerja pendek (5/12 x 8jt)', async () => {
      mockEmployeeService.findActive.mockResolvedValue([
        { id: 'emp-2', startDate: new Date('2025-10-01'), employments: [{ grade: { level: 8 } }] },
      ]);
      await service.calculateRun('t1', 'run-1');
      const data = mockPrisma.thrRecord.upsert.mock.calls[0][0];
      expect(data.create.monthsWorked).toBe(5);
      expect(Number(data.create.amount)).toBe(Math.round((8000000 * 5) / 12));
    });

    it('melewatkan karyawan < 1 bulan (tidak dibuatkan record)', async () => {
      mockEmployeeService.findActive.mockResolvedValue([
        { id: 'emp-3', startDate: new Date('2026-03-01'), employments: [{ grade: { level: 5 } }] },
      ]);
      const result = await service.calculateRun('t1', 'run-1');
      expect(result.calculated).toBe(0);
      expect(mockPrisma.thrRecord.upsert).not.toHaveBeenCalled();
    });

    it('menambahkan tunjangan FIXED ke wageBase', async () => {
      mockEmployeeService.findActive.mockResolvedValue([
        { id: 'emp-1', startDate: new Date('2016-02-01'), employments: [{ grade: { level: 8 } }] },
      ]);
      mockPrisma.payrollComponent.findMany.mockResolvedValueOnce([
        { defaultValue: 1000000, value: null },
      ]);
      await service.calculateRun('t1', 'run-1');
      const data = mockPrisma.thrRecord.upsert.mock.calls[0][0];
      expect(Number(data.create.wageBase)).toBe(9000000);
    });

    it('menolak kalkulasi run non-DRAFT', async () => {
      mockPrisma.thrRun.findFirst.mockResolvedValueOnce({ ...run, status: 'APPROVED' });
      await expect(service.calculateRun('t1', 'run-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('approve/markPaid/cancel', () => {
    it('approve menerbitkan earning adjustment berbatas + APPROVED', async () => {
      mockPrisma.thrRecord.findMany.mockResolvedValue([
        { employeeId: 'emp-1', amount: 8000000, monthsWorked: 12 },
      ]);
      await service.approveRun('t1', 'run-1', 'hr-1');
      expect(mockAdjustments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EARNING',
          amount: 8000000,
          sourceEvent: 'THR_ACCRUED',
          effectiveDate: HOLIDAY,
          expiresAt: HOLIDAY,
        }),
      );
      expect(mockPrisma.thrRun.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
      );
    });

    it('markPaid hanya dari APPROVED', async () => {
      mockPrisma.thrRun.findFirst.mockResolvedValueOnce({ ...run, status: 'APPROVED' });
      mockPrisma.thrRun.update.mockResolvedValueOnce({ ...run, status: 'PAID' });
      const res: any = await service.markPaid('t1', 'run-1');
      expect(mockPrisma.thrRecord.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'paid' }) }),
      );
      expect(res).toBeDefined();
    });

    it('approve idempoten: lewati karyawan yang sudah terbit', async () => {
      mockPrisma.thrRecord.findMany.mockResolvedValue([
        { employeeId: 'emp-1', amount: 8000000, monthsWorked: 12 },
        { employeeId: 'emp-2', amount: 4000000, monthsWorked: 6 },
      ]);
      mockPrisma.payrollAdjustment.findMany.mockResolvedValueOnce([{ employeeId: 'emp-1' }]);
      await service.approveRun('t1', 'run-1', 'hr-1');
      expect(mockAdjustments.create).toHaveBeenCalledTimes(1);
      expect(mockAdjustments.create).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'emp-2' }),
      );
    });

    it('markPaid mengenakan denda 5%/hari bila lewat dueDate', async () => {
      const due = new Date();
      due.setDate(due.getDate() - 2);
      mockPrisma.thrRun.findFirst.mockResolvedValueOnce({ ...run, status: 'APPROVED', dueDate: due });
      mockPrisma.thrRun.update.mockResolvedValueOnce({ ...run, status: 'PAID' });
      mockPrisma.thrRecord.findMany.mockResolvedValue([
        { employeeId: 'emp-1', amount: 8000000, monthsWorked: 12 },
      ]);
      const res: any = await service.markPaid('t1', 'run-1');
      expect(res.daysLate).toBeGreaterThanOrEqual(2);
      expect(res.lateFeeTotal).toBe(Math.round(8000000 * 0.05 * res.daysLate));
      expect(mockAdjustments.create).toHaveBeenCalledWith(
        expect.objectContaining({ sourceEvent: 'THR_LATE_FEE', type: 'EARNING' }),
      );
    });

    it('cancel hanya dari DRAFT; findOne 404 bila run hilang', async () => {
      mockPrisma.thrRun.findFirst.mockResolvedValueOnce({ ...run, status: 'APPROVED' });
      await expect(service.cancelRun('t1', 'run-1')).rejects.toBeInstanceOf(BadRequestException);
      mockPrisma.thrRun.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
