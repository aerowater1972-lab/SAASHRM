import { Test, TestingModule } from '@nestjs/testing';
import { AssetService } from './asset.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

describe('AssetService - QR + depresiasi', () => {
  let service: AssetService;

  const mockPrisma: any = {
    asset: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    assetAssignment: { findFirst: jest.fn() },
    assetDepreciation: { findMany: jest.fn(), upsert: jest.fn() },
  };
  const mockEmployeeService = { findById: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
    }).compile();
    service = module.get<AssetService>(AssetService);
  });

  afterEach(() => jest.clearAllMocks());

  const laptop = (over: any = {}) => ({
    id: 'a-1', tenantId: 't1', code: 'LTP-001', name: 'Laptop',
    purchasePrice: 12_000_000, residualValue: 0, usefulLifeMonths: 24,
    depreciationMethod: 'STRAIGHT_LINE',
    depreciationStartDate: new Date('2026-01-15'),
    purchaseDate: new Date('2026-01-15'),
    ...over,
  });

  it('create memberi qrToken unik + field depresiasi', async () => {
    mockPrisma.asset.findUnique.mockResolvedValue(null);
    mockPrisma.asset.findFirst.mockResolvedValue(null);
    mockPrisma.asset.create.mockImplementation((args: any) => Promise.resolve({ id: 'a-1', ...args.data }));
    const created: any = await service.create('t1', {
      name: 'Laptop', code: 'LTP-001', category: 'LAPTOP' as any,
      purchasePrice: 12_000_000, usefulLifeMonths: 24,
    } as any);
    expect(created.qrToken).toBeTruthy();
    expect(created.depreciationMethod).toBe('STRAIGHT_LINE');
  });

  it('create menolak metode depresiasi tak dikenal', async () => {
    mockPrisma.asset.findUnique.mockResolvedValue(null);
    await expect(service.create('t1', {
      name: 'X', code: 'X-1', category: 'OTHER' as any, depreciationMethod: 'SUM_OF_YEARS',
    } as any)).rejects.toThrow('STRAIGHT_LINE');
  });

  it('garis lurus: 12jt/24bln = 500rb per bulan', async () => {
    mockPrisma.asset.findMany.mockResolvedValue([laptop()]);
    mockPrisma.assetDepreciation.findMany.mockResolvedValue([]);
    mockPrisma.assetDepreciation.upsert.mockImplementation((args: any) => Promise.resolve(args.create));
    const res: any = await service.runDepreciation('t1', 2026, 3);
    expect(res.results).toHaveLength(1);
    expect(res.results[0].amount).toBe(500_000);
    expect(res.results[0].bookValueAfter).toBe(11_500_000);
  });

  it('nilai buku tidak pernah di bawah residu', async () => {
    mockPrisma.asset.findMany.mockResolvedValue([laptop({ residualValue: 11_600_000 })]);
    mockPrisma.assetDepreciation.findMany.mockResolvedValue([]);
    mockPrisma.assetDepreciation.upsert.mockImplementation((args: any) => Promise.resolve(args.create));
    const res: any = await service.runDepreciation('t1', 2026, 3);
    // (12jt - 11,6jt) / 24 = 16.667/bln; lantai residu dijaga tiap posting
    expect(res.results[0].amount).toBe(16667);
    expect(res.results[0].bookValueAfter).toBe(11_983_333);
  });

  it('bulan terakhir hanya menyusutkan sisa di atas residu', async () => {
    mockPrisma.asset.findMany.mockResolvedValue([laptop()]);
    mockPrisma.assetDepreciation.findMany.mockResolvedValue([{ bookValueAfter: 300_000 }]);
    mockPrisma.assetDepreciation.upsert.mockImplementation((args: any) => Promise.resolve(args.create));
    const res: any = await service.runDepreciation('t1', 2027, 12);
    // bulanan SL 500rb tapi sisa hanya 300rb -> posting 300rb, buku 0
    expect(res.results[0].amount).toBe(300_000);
    expect(res.results[0].bookValueAfter).toBe(0);
  });

  it('melewati aset belum mulai dan sudah habis', async () => {
    mockPrisma.asset.findMany.mockResolvedValue([
      laptop({ id: 'a-future', code: 'F-1', depreciationStartDate: new Date('2027-01-01'), purchaseDate: new Date('2027-01-01') }),
      laptop({ id: 'a-done', code: 'D-1' }),
    ]);
    mockPrisma.assetDepreciation.findMany.mockImplementation((args: any) => {
      if (args.where.assetId === 'a-done') {
        return Promise.resolve([{ bookValueAfter: 0 }]);
      }
      return Promise.resolve([]);
    });
    const res: any = await service.runDepreciation('t1', 2026, 3);
    expect(res.results.find((r: any) => r.assetId === 'a-future').skipped).toBe('belum mulai');
    expect(res.results.find((r: any) => r.assetId === 'a-done').skipped).toBe('sudah habis');
    expect(mockPrisma.assetDepreciation.upsert).not.toHaveBeenCalled();
  });

  it('saldo menurun memakai tarif ganda atas nilai buku berjalan', async () => {
    mockPrisma.asset.findMany.mockResolvedValue([laptop({ id: 'a-db', code: 'DB-1', depreciationMethod: 'DECLINING_BALANCE' })]);
    // book berjalan 9jt (setelah 6 bulan SL @500rb) -> DB: 9jt * 2/24 = 750rb
    mockPrisma.assetDepreciation.findMany.mockResolvedValue([{ bookValueAfter: 9_000_000 }]);
    mockPrisma.assetDepreciation.upsert.mockImplementation((args: any) => Promise.resolve(args.create));
    const res: any = await service.runDepreciation('t1', 2026, 8);
    expect(res.results[0].amount).toBe(750_000);
    expect(res.results[0].bookValueAfter).toBe(8_250_000);
  });

  it('verifyByToken hanya membuka info non-PII', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({
      code: 'LTP-001', name: 'Laptop', category: 'LAPTOP', brand: 'B', model: 'M',
      serialNumber: 'S', status: 'ASSIGNED', condition: 'GOOD',
      assignments: [{ employee: { fullName: 'Budi' }, assignedAt: new Date() }],
    });
    const v: any = await service.verifyByToken('tok123');
    expect(v.code).toBe('LTP-001');
    expect(v.holder).toBe('Budi');
    expect(v).not.toHaveProperty('email');
  });

  it('verifyByToken 404 untuk token asing', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue(null);
    await expect(service.verifyByToken('nope')).rejects.toThrow('tidak ditemukan');
  });

  it('menolak bulan di luar 1-12', async () => {
    await expect(service.runDepreciation('t1', 2026, 13)).rejects.toThrow('1-12');
  });
});
