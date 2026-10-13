import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { Prisma } from '@prisma/client';

const TENANT = 't-1';
const EMP = 'e-1';

const buildPrisma = (over: any = {}) => ({
  timesheetEntry: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'ts-1', ...data })),
    update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'ts-1', ...data })),
    updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    delete: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  payrollPeriod: { findFirst: jest.fn() },
  task: { findFirst: jest.fn() },
  project: { findFirst: jest.fn() },
  ...over,
});

const makeService = async (prisma: any) => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      TimesheetService,
      { provide: PrismaService, useValue: prisma },
      { provide: AuditService, useValue: { ingest: jest.fn() } },
    ],
  }).compile();
  return module.get<TimesheetService>(TimesheetService);
};

describe('TimesheetService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getWeekly', () => {
    it('mengelompokkan entri per tugas dan menghitung total hari + grand total', async () => {
      const prisma = buildPrisma();
      prisma.timesheetEntry.findMany.mockResolvedValue([
        {
          id: 'a', taskId: 'task-1', projectId: null, workDate: new Date('2026-10-12T00:00:00Z'),
          hours: new Prisma.Decimal(3.5), description: 'coding', billable: true, status: 'APPROVED',
          task: { id: 'task-1', title: 'Fitur X', projectId: 'p-1', project: { name: 'Proyek A' } },
          project: null,
        },
        {
          id: 'b', taskId: 'task-1', projectId: null, workDate: new Date('2026-10-13T00:00:00Z'),
          hours: new Prisma.Decimal(4), description: null, billable: true, status: 'DRAFT',
          task: { id: 'task-1', title: 'Fitur X', projectId: 'p-1', project: { name: 'Proyek A' } },
          project: null,
        },
        {
          id: 'c', taskId: null, projectId: 'p-2', workDate: new Date('2026-10-13T00:00:00Z'),
          hours: new Prisma.Decimal(1.5), description: 'rapat', billable: false, status: 'DRAFT',
          task: null,
          project: { id: 'p-2', name: 'Proyek B' },
        },
      ]);
      const svc = await makeService(prisma);
      // 2026-10-13 adalah Selasa → minggu 2026-10-12..2026-10-18.
      const grid = await svc.getWeekly(TENANT, EMP, '2026-10-13');

      expect(grid.weekStart).toBe('2026-10-12');
      expect(grid.weekEnd).toBe('2026-10-18');
      expect(grid.days).toHaveLength(7);
      expect(grid.rows).toHaveLength(2);

      const taskRow = grid.rows.find((r) => r.taskId === 'task-1')!;
      expect(taskRow.total).toBe(7.5);
      expect(taskRow.cells['2026-10-12'].hours).toBe(3.5);
      expect(taskRow.cells['2026-10-13'].hours).toBe(4);
      expect(taskRow.cells['2026-10-12'].status).toBe('APPROVED');

      const projRow = grid.rows.find((r) => r.taskId === null)!;
      expect(projRow.total).toBe(1.5);

      expect(grid.dayTotals['2026-10-13']).toBe(5.5);
      expect(grid.grandTotal).toBe(9);
      expect(grid.locked).toBe(false);
    });

    it('menandai locked=true saat ada periode payroll CLOSED/LOCKED yang menutup rentang', async () => {
      const prisma = buildPrisma();
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'pp-1' });
      const svc = await makeService(prisma);
      const grid = await svc.getWeekly(TENANT, EMP, '2026-10-13');
      expect(grid.locked).toBe(true);
      expect(prisma.payrollPeriod.findFirst).toHaveBeenCalled();
    });
  });


  describe('upsertEntry', () => {
    it('menolak jam di luar 0.25-24', async () => {
      const prisma = buildPrisma();
      const svc = await makeService(prisma);
      await expect(svc.upsertEntry(TENANT, EMP, { taskId: 'task-1', workDate: '2026-10-13', hours: 25 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.upsertEntry(TENANT, EMP, { taskId: 'task-1', workDate: '2026-10-13', hours: 0 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('menolak entri tanpa taskId dan projectId', async () => {
      const prisma = buildPrisma();
      const svc = await makeService(prisma);
      await expect(svc.upsertEntry(TENANT, EMP, { workDate: '2026-10-13', hours: 3 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('menolak entri pada tanggal dalam periode payroll yang dikunci', async () => {
      const prisma = buildPrisma();
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'pp-1' });
      const svc = await makeService(prisma);
      await expect(
        svc.upsertEntry(TENANT, EMP, { taskId: 'task-1', workDate: '2026-09-15', hours: 3 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.timesheetEntry.create).not.toHaveBeenCalled();
    });

    it('membuat entri baru bila belum ada, setelah validasi task milik tenant', async () => {
      const prisma = buildPrisma();
      prisma.task.findFirst.mockResolvedValue({ id: 'task-1', projectId: 'p-1' });
      const svc = await makeService(prisma);
      const entry = await svc.upsertEntry(TENANT, EMP, { taskId: 'task-1', workDate: '2026-10-13', hours: 4 });
      expect(entry.id).toBe('ts-1');
      expect(prisma.timesheetEntry.findUnique).toHaveBeenCalled();
      expect(prisma.timesheetEntry.create).toHaveBeenCalled();
      expect(prisma.timesheetEntry.update).not.toHaveBeenCalled();
    });

    it('memperbarui entri existing (idempoten) dan mengembalikan status ke DRAFT', async () => {
      const prisma = buildPrisma();
      prisma.task.findFirst.mockResolvedValue({ id: 'task-1', projectId: 'p-1' });
      prisma.timesheetEntry.findUnique.mockResolvedValue({ id: 'existing-1' });
      const svc = await makeService(prisma);
      await svc.upsertEntry(TENANT, EMP, { taskId: 'task-1', workDate: '2026-10-13', hours: 6 });
      expect(prisma.timesheetEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-1' },
          data: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
      expect(prisma.timesheetEntry.create).not.toHaveBeenCalled();
    });

    it('menolak task yang tidak ada / bukan milik tenant', async () => {
      const prisma = buildPrisma();
      prisma.task.findFirst.mockResolvedValue(null);
      const svc = await makeService(prisma);
      await expect(
        svc.upsertEntry(TENANT, EMP, { taskId: 'foreign', workDate: '2026-10-13', hours: 3 }),
      ).rejects.toThrow('Tugas tidak ditemukan');
    });
  });


  describe('submitWeek & reviewEntry', () => {
    it('submitWeek mengubah DRAFT → SUBMITTED pada rentang minggu', async () => {
      const prisma = buildPrisma();
      const svc = await makeService(prisma);
      const res = await svc.submitWeek(TENANT, EMP, '2026-10-13');
      expect(res.submitted).toBe(2);
      expect(prisma.timesheetEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SUBMITTED' } }),
      );
    });

    it('reviewEntry approve menyetujui + mencatat approver', async () => {
      const prisma = buildPrisma();
      prisma.timesheetEntry.findFirst.mockResolvedValue({ id: 'ts-1' });
      const svc = await makeService(prisma);
      await svc.reviewEntry(TENANT, 'ts-1', true, 'hr-1');
      expect(prisma.timesheetEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approvedBy: 'hr-1' }),
        }),
      );
    });

    it('reviewEntry reject menolak entri', async () => {
      const prisma = buildPrisma();
      prisma.timesheetEntry.findFirst.mockResolvedValue({ id: 'ts-1' });
      const svc = await makeService(prisma);
      await svc.reviewEntry(TENANT, 'ts-1', false, 'hr-1');
      expect(prisma.timesheetEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }),
      );
    });
  });

  describe('approvedHoursSummary', () => {
    it('meringkas jam APPROVED per karyawan (dasar payroll)', async () => {
      const prisma = buildPrisma();
      prisma.timesheetEntry.groupBy.mockResolvedValue([
        { employeeId: 'e-1', _sum: { hours: new Prisma.Decimal(42.5) } },
        { employeeId: 'e-2', _sum: { hours: null } },
      ]);
      const svc = await makeService(prisma);
      const summary = await svc.approvedHoursSummary(TENANT, new Date('2026-10-01'), new Date('2026-10-31'));
      expect(summary).toEqual([
        { employeeId: 'e-1', approvedHours: 42.5 },
        { employeeId: 'e-2', approvedHours: 0 },
      ]);
      expect(prisma.timesheetEntry.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'APPROVED' }) }),
      );
    });
  });
});

