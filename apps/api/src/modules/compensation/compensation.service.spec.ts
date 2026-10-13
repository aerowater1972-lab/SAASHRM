import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { PayrollAdjustmentService } from '@modules/payroll/services/payroll-adjustment.service';
import { CompensationService } from './compensation.service';

function buildPrismaMock() {
  return {
    compSalaryStructure: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    compReviewCycle: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    compAdjustment: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    employee: { findFirst: jest.fn() },
    employment: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
  };
}

type PrismaMock = ReturnType<typeof buildPrismaMock>;

describe('CompensationService (GAP-06 / Epic 2.1)', () => {
  let service: CompensationService;
  let prisma: PrismaMock;
  let adjustments: { create: jest.Mock };

  const TENANT = 'tenant-1';
  const USER = 'user-1';

  beforeEach(async () => {
    prisma = buildPrismaMock();
    adjustments = { create: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompensationService,
        { provide: PrismaService, useValue: prisma },
        { provide: PayrollAdjustmentService, useValue: adjustments },
      ],
    }).compile();
    service = moduleRef.get(CompensationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('CM-01: tolak struktur dengan min > mid', async () => {
    await expect(
      service.createStructure(TENANT, {
        jobFamily: 'Engineering',
        grade: 'E4',
        minSalary: 10,
        midSalary: 8,
        maxSalary: 15,
        effectiveDate: '2027-01-01',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CM-01: buat struktur valid', async () => {
    prisma.compSalaryStructure.create.mockResolvedValue({ id: 's-1' });
    const res = await service.createStructure(TENANT, {
      jobFamily: 'Engineering',
      grade: 'E4',
      minSalary: 8,
      midSalary: 10,
      maxSalary: 12,
      effectiveDate: '2027-01-01',
    } as any);
    expect(res).toEqual({ id: 's-1' });
  });

  it('CM-04: bulk kosong DITOLAK', async () => {
    await expect(
      service.bulkAdjustments(TENANT, { effectiveDate: '2027-04-01', items: [] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CM-04: approve cycle bulk-approve PENDING', async () => {
    prisma.compReviewCycle.findFirst.mockResolvedValue({ id: 'c-1', status: 'OPEN' });
    prisma.compAdjustment.updateMany.mockResolvedValue({ count: 3 });
    prisma.compReviewCycle.update.mockResolvedValue({ id: 'c-1', status: 'APPROVED' });
    const res = await service.approveCycle(TENANT, 'c-1', USER);
    expect(res).toEqual({ id: 'c-1', status: 'APPROVED' });
  });

  it('CM-04: bulk hitung persen + OPEN->IN_REVIEW', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
    prisma.compReviewCycle.findFirst.mockResolvedValue({ id: 'c-1', status: 'OPEN' });
    prisma.compAdjustment.createMany.mockResolvedValue({ count: 2 });
    prisma.compReviewCycle.update.mockResolvedValue({ id: 'c-1', status: 'IN_REVIEW' });
    const res = await service.bulkAdjustments(TENANT, {
      reviewCycleId: 'c-1',
      effectiveDate: '2027-04-01',
      items: [
        { employeeId: 'emp-1', currentSalary: 10, proposedSalary: 11 },
        { employeeId: 'emp-1', currentSalary: 10, proposedSalary: 12 },
      ],
    } as any);
    expect(res).toEqual({ created: 2, reviewCycleId: 'c-1' });
    const rows = prisma.compAdjustment.createMany.mock.calls[0][0].data;
    expect(rows[0].adjustmentPercentage).toBe(10);
    expect(rows[1].adjustmentPercentage).toBe(20);
  });

  it('CM-06: sync APPROVED idempotent', async () => {
    prisma.compAdjustment.findFirst.mockResolvedValue({
      id: 'a-1',
      employeeId: 'emp-1',
      status: 'APPROVED',
      syncedToPayroll: false,
      adjustmentType: 'MERIT',
      currentSalary: 10,
      proposedSalary: 11,
      effectiveDate: new Date('2027-04-01'),
    });
    prisma.compAdjustment.update.mockResolvedValue({ id: 'a-1', status: 'APPLIED' });
    const res = await service.syncToPayroll(TENANT, 'a-1');
    expect((res as any).alreadySynced).toBe(false);
    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SALARY_UPDATE', referenceId: 'a-1' }),
    );
    prisma.compAdjustment.findFirst.mockResolvedValue({
      id: 'a-1',
      status: 'APPROVED',
      syncedToPayroll: true,
    });
    const res2 = await service.syncToPayroll(TENANT, 'a-1');
    expect((res2 as any).alreadySynced).toBe(true);
    expect(adjustments.create).toHaveBeenCalledTimes(1);
  });

  it('CM-06: sync PENDING DITOLAK', async () => {
    prisma.compAdjustment.findFirst.mockResolvedValue({ id: 'a-2', status: 'PENDING' });
    await expect(service.syncToPayroll(TENANT, 'a-2')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CM-05: equity butuh struktur aktif', async () => {
    prisma.compSalaryStructure.findMany.mockResolvedValue([]);
    await expect(service.equityAnalysis(TENANT)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CM-05: equity hitung compa-ratio + band', async () => {
    prisma.compSalaryStructure.findMany.mockResolvedValue([
      { jobFamily: 'Engineering', grade: 'E4', midSalary: 10 },
    ]);
    prisma.employment.findMany.mockResolvedValue([
      { salary: 9, grade: { name: 'E4' }, employee: { id: 'e1' }, position: { title: 'Dev' } },
      { salary: 15, grade: { name: 'E4' }, employee: { id: 'e2' }, position: { title: 'Dev' } },
    ]);
    prisma.employment.count.mockResolvedValue(2);
    const res = await service.equityAnalysis(TENANT);
    expect(res.items[0].compaRatio).toBe(90);
    expect(res.items[0].band).toBe('WITHIN');
    expect(res.items[1].band).toBe('ABOVE');
    expect(res.summary.withinBand).toBe(1);
  });

  it('CM-05: totalRewards tanpa employee DITOLAK', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);
    await expect(service.totalRewards(TENANT, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
