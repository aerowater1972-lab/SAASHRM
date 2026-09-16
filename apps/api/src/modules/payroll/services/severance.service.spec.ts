import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SeveranceService } from './severance.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

/**
 * SeveranceService — matriks PP 35/2021. Jangkar hitungan tangan:
 * - UP: 0,5th->1; 2,5th->3; >=8th->9 bln upah
 * - UPMK: 2th->0; 4th->2; 10th->4; 25th->10 bln upah
 * - TERMINATION 5th/8jt: 40jt + 16jt + 8,4jt = 64,4jt
 * - RESIGN: hanya UPH (+pisah); MISCONDUCT sama
 * - RETIREMENT 10th/10jt: 157,5jt + 40jt + 29,625jt = 227,125jt
 * - DEATH 3th/6jt: 48jt + 12jt + 9jt = 69jt
 * - CONTRACT_END 30 bln/5jt: 30/12 x 5jt = 12,5jt
 * Matriks pengali wajib review biro hukum untuk kasus sengketa.
 */
describe('SeveranceService (PP 35/2021)', () => {
  let service: SeveranceService;
  let prisma: any;

  const mockPrisma = {
    severanceCase: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    payrollComponent: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const mockEmployeeService = { findById: jest.fn() };

  const emp = (startDate: string, level: number) => ({
    id: 'emp-1', startDate: new Date(startDate), employments: [{ grade: { level } }],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeveranceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
    }).compile();

    service = module.get<SeveranceService>(SeveranceService);
  });

  afterEach(() => jest.clearAllMocks());

  it.each([
    [0.5, 1],
    [2.5, 3],
    [8, 9],
  ])('UP %i tahun masa kerja -> %i bulan upah', (years, expected) => {
    expect(service.upMonths(years)).toBe(expected);
  });

  it.each([
    [2, 0],
    [4, 2],
    [10, 4],
    [25, 10],
  ])('UPMK %i tahun masa kerja -> %i bulan upah', (years, expected) => {
    expect(service.upmkMonths(years)).toBe(expected);
  });

  function mockCreate(startDate: string, level: number) {
    mockEmployeeService.findById.mockResolvedValue(emp(startDate, level));
    mockPrisma.severanceCase.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'case-1', status: 'DRAFT', ...data }),
    );
  }

  it('TERMINATION 4th/8jt -> 64,4jt', async () => {
    mockCreate('2022-06-01', 8);
    const r: any = await service.createCase('t1', {
      employeeId: 'emp-1', cause: 'TERMINATION', terminationDate: '2026-06-01',
    } as any);
    expect(Number(r.upAmount)).toBe(40000000);
    expect(Number(r.upmkAmount)).toBe(16000000);
    expect(Number(r.uphAmount)).toBe(8400000);
    expect(Number(r.totalAmount)).toBe(64400000);
  });

  it('RESIGNATION: hanya UPH + pisah', async () => {
    mockCreate('2020-01-15', 5);
    const r: any = await service.createCase('t1', {
      employeeId: 'emp-1', cause: 'RESIGNATION', terminationDate: '2026-06-01', pisahAmount: 2000000,
    } as any);
    expect(Number(r.upAmount)).toBe(0);
    expect(Number(r.upmkAmount)).toBe(0);
    expect(Number(r.uphAmount)).toBe(0);
    expect(Number(r.totalAmount)).toBe(2000000);
  });

  it('RETIREMENT 10th/10jt -> 227,125jt', async () => {
    mockCreate('2016-06-01', 10);
    const r: any = await service.createCase('t1', {
      employeeId: 'emp-1', cause: 'RETIREMENT', terminationDate: '2026-06-01',
    } as any);
    expect(Number(r.upAmount)).toBe(157500000);
    expect(Number(r.upmkAmount)).toBe(40000000);
    expect(Number(r.uphAmount)).toBe(29625000);
    expect(Number(r.totalAmount)).toBe(227125000);
  });

  it('DEATH 3th/6jt -> 69jt', async () => {
    mockCreate('2023-06-01', 6);
    const r: any = await service.createCase('t1', {
      employeeId: 'emp-1', cause: 'DEATH', terminationDate: '2026-06-01',
    } as any);
    expect(Number(r.upAmount)).toBe(48000000);
    expect(Number(r.upmkAmount)).toBe(12000000);
    expect(Number(r.uphAmount)).toBe(9000000);
    expect(Number(r.totalAmount)).toBe(69000000);
  });

  it('CONTRACT_END 30 bln/5jt -> kompensasi 12,5jt', async () => {
    mockCreate('2023-12-01', 5);
    const r: any = await service.createCase('t1', {
      employeeId: 'emp-1', cause: 'CONTRACT_END', terminationDate: '2026-06-01',
    } as any);
    expect(Number(r.totalAmount)).toBe(12500000);
    expect(Number(r.upAmount)).toBe(0);
  });

  it('menolak sebab tak dikenal, tanggal mundur, dan karyawan hilang', async () => {
    mockEmployeeService.findById.mockResolvedValue(emp('2021-06-01', 8));
    await expect(
      service.createCase('t1', { employeeId: 'emp-1', cause: 'NOPE', terminationDate: '2026-06-01' } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createCase('t1', { employeeId: 'emp-1', cause: 'TERMINATION', terminationDate: '2020-01-01' } as any),
    ).rejects.toThrow(BadRequestException);
    mockEmployeeService.findById.mockResolvedValue(null);
    await expect(
      service.createCase('t1', { employeeId: 'ghost', cause: 'TERMINATION', terminationDate: '2026-06-01' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('siklus DRAFT->APPROVED->PAID; tolak transisi ilegal', async () => {
    mockPrisma.severanceCase.findFirst.mockResolvedValue({ id: 'case-1', status: 'DRAFT' });
    mockPrisma.severanceCase.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 'case-1', ...data }));
    const ap: any = await service.approve('t1', 'case-1', 'hr-1');
    expect(ap.status).toBe('APPROVED');
    mockPrisma.severanceCase.findFirst.mockResolvedValue({ id: 'case-1', status: 'APPROVED' });
    const pd: any = await service.markPaid('t1', 'case-1');
    expect(pd.status).toBe('PAID');
    mockPrisma.severanceCase.findFirst.mockResolvedValue({ id: 'case-1', status: 'PAID' });
    await expect(service.approve('t1', 'case-1')).rejects.toThrow(BadRequestException);
    await expect(service.markPaid('t1', 'case-1')).rejects.toThrow(BadRequestException);
  });
});
