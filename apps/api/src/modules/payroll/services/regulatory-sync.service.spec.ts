import { RegulatorySyncService } from './regulatory-sync.service';

describe('RegulatorySyncService', () => {
  let service: RegulatorySyncService;
  const prisma: any = {
    tenant: { findMany: jest.fn() },
    bpjsConfig: { findMany: jest.fn(), create: jest.fn() },
    taxConfig: { findMany: jest.fn(), create: jest.fn() },
    provincialMinimumWage: { findMany: jest.fn(), create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RegulatorySyncService(prisma);
  });

  it('clones latest configs forward when the new year has none', async () => {
    prisma.tenant.findMany.mockResolvedValue([{ id: 't1' }]);
    prisma.bpjsConfig.findMany.mockResolvedValue([
      {
        id: 'b1',
        tenantId: 't1',
        type: 'KES',
        jkmRate: 0.003,
        jkkRate: 0.0054,
        jhtEmployerRate: 0.037,
        jhtEmployeeRate: 0.02,
        pensionEmployerRate: 0.02,
        pensionEmployeeRate: 0.01,
        maxWageLimit: null,
        effectiveDate: new Date(2026, 0, 1),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.taxConfig.findMany.mockResolvedValue([
      {
        id: 'x1',
        tenantId: 't1',
        taxMethod: 'TER',
        ptkp: 54000000,
        terCategory: 'A',
        effectiveDate: new Date(2026, 0, 1),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.provincialMinimumWage.findMany.mockResolvedValue([
      {
        id: 'u1',
        tenantId: 't1',
        province: 'DKI Jakarta',
        year: 2026,
        minimumWage: 5600000,
        effectiveDate: new Date(2026, 0, 1),
        source: 'Kepgub 2026',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.bpjsConfig.create.mockResolvedValue({ id: 'b2' });
    prisma.taxConfig.create.mockResolvedValue({ id: 'x2' });
    prisma.provincialMinimumWage.create.mockResolvedValue({ id: 'u2' });

    const summary = await service.syncYear(2027);

    expect(summary).toEqual({ tenants: 1, bpjsCloned: 1, taxCloned: 1, umpCloned: 1 });
    expect(prisma.bpjsConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ effectiveDate: new Date(2027, 0, 1) }),
      }),
    );
    expect(prisma.provincialMinimumWage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          year: 2027,
          source: 'CARRY_FORWARD_PENDING_REVIEW',
        }),
      }),
    );
  });

  it('skips cloning when the new year already has configs', async () => {
    prisma.tenant.findMany.mockResolvedValue([{ id: 't1' }]);
    prisma.bpjsConfig.findMany.mockResolvedValue([
      {
        id: 'b2',
        tenantId: 't1',
        type: 'KES',
        effectiveDate: new Date(2027, 0, 1),
        status: 'ACTIVE',
      },
    ]);
    prisma.taxConfig.findMany.mockResolvedValue([]);
    prisma.provincialMinimumWage.findMany.mockResolvedValue([
      { id: 'u2', tenantId: 't1', province: 'DKI Jakarta', year: 2027 },
    ]);

    const summary = await service.syncYear(2027);

    expect(summary).toEqual({ tenants: 1, bpjsCloned: 0, taxCloned: 0, umpCloned: 0 });
    expect(prisma.bpjsConfig.create).not.toHaveBeenCalled();
    expect(prisma.provincialMinimumWage.create).not.toHaveBeenCalled();
  });

  it('handles tenants with no configs', async () => {
    prisma.tenant.findMany.mockResolvedValue([]);
    prisma.bpjsConfig.findMany.mockResolvedValue([]);
    prisma.taxConfig.findMany.mockResolvedValue([]);
    prisma.provincialMinimumWage.findMany.mockResolvedValue([]);

    const summary = await service.syncYear(2027);

    expect(summary).toEqual({ tenants: 0, bpjsCloned: 0, taxCloned: 0, umpCloned: 0 });
  });
});
