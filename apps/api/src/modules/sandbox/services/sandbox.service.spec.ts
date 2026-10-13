import { SandboxService } from './sandbox.service';
import { BadRequestException } from '@nestjs/common';

describe('SandboxService', () => {
  let service: SandboxService;
  let tx: any;
  let prisma: any;

  beforeEach(() => {
    tx = {
      organization: { findFirst: jest.fn(), create: jest.fn() },
      department: { create: jest.fn() },
      position: { create: jest.fn() },
      employee: { create: jest.fn() },
      employment: { create: jest.fn() },
      attendanceRecord: { create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      sandboxEnvironment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new SandboxService(prisma);

    tx.organization.findFirst.mockResolvedValue(null);
    tx.organization.create.mockResolvedValue({ id: 'org1' });
    tx.department.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `dep-${data.code}`, ...data }),
    );
    tx.position.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `pos-${data.code}`, ...data }),
    );
    tx.employee.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `emp-${data.employeeId}`, ...data }),
    );
    tx.employment.create.mockResolvedValue({ id: 'empl1' });
    tx.attendanceRecord.create.mockResolvedValue({ id: 'att1' });
    prisma.sandboxEnvironment.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'sbx1', createdAt: new Date(), ...data }),
    );
  });

  it('provisions a minimal sandbox: 1 dept, 1 position, 1 employee, 5 attendance (UAT OA-04-04)', async () => {
    const res = await service.setup('t1', 'minimal');

    expect(tx.department.create).toHaveBeenCalledTimes(1);
    expect(tx.position.create).toHaveBeenCalledTimes(1);
    expect(tx.employee.create).toHaveBeenCalledTimes(1);
    expect(tx.employment.create).toHaveBeenCalledTimes(1);
    expect(tx.attendanceRecord.create).toHaveBeenCalledTimes(5);
    expect(res.data).toEqual({
      departments: 1,
      positions: 1,
      employees: 1,
      attendanceRecords: 5,
    });
    expect(res.sampleType).toBe('minimal');
    expect(res.id).toBe('sbx1');
  });

  it('provisions a demo sandbox: 2 depts, 3 positions, 5 employees (UAT OA-04-01)', async () => {
    const res = await service.setup('t1', 'demo');

    expect(res.data).toEqual({
      departments: 2,
      positions: 3,
      employees: 5,
      attendanceRecords: 25,
    });
    expect(prisma.sandboxEnvironment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        sampleType: 'demo',
        status: 'active',
        recordsCreated: 35,
      }),
    });
  });

  it('records recordsCreated as the total number of rows (minimal = 8)', async () => {
    await service.setup('t1', 'minimal');
    expect(prisma.sandboxEnvironment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recordsCreated: 8 }),
    });
  });

  it('rejects an unknown sample type with 400 (UAT OA-04-05)', async () => {
    await expect(service.setup('t1', 'unknown' as any)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reuses an existing organization instead of creating a duplicate', async () => {
    tx.organization.findFirst.mockResolvedValue({ id: 'org-existing' });

    await service.setup('t1', 'minimal');

    expect(tx.organization.create).not.toHaveBeenCalled();
    expect(tx.department.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org-existing' }),
      }),
    );
  });

  it('getStatus throws when the sandbox is unknown', async () => {
    prisma.sandboxEnvironment.findFirst.mockResolvedValue(null);
    await expect(service.getStatus('nope', 't1')).rejects.toThrow(BadRequestException);
  });

  it('getStatus returns the sandbox for the tenant (UAT OA-04-02)', async () => {
    const sbx = { id: 'sbx1', tenantId: 't1', status: 'active' };
    prisma.sandboxEnvironment.findFirst.mockResolvedValue(sbx);
    await expect(service.getStatus('sbx1', 't1')).resolves.toBe(sbx);
  });

  it('cleanup deletes the sandbox row (UAT OA-04-03)', async () => {
    prisma.sandboxEnvironment.findFirst.mockResolvedValue({ id: 'sbx1', tenantId: 't1' });

    const res = await service.cleanup('sbx1', 't1');

    expect(prisma.sandboxEnvironment.delete).toHaveBeenCalledWith({ where: { id: 'sbx1' } });
    expect(res).toEqual({ message: 'Sandbox environment cleaned up', id: 'sbx1' });
  });

  it('cleanup rejects unknown sandboxes', async () => {
    prisma.sandboxEnvironment.findFirst.mockResolvedValue(null);
    await expect(service.cleanup('nope', 't1')).rejects.toThrow(BadRequestException);
  });

  it('findAll lists sandboxes for the tenant', async () => {
    prisma.sandboxEnvironment.findMany.mockResolvedValue([{ id: 'sbx1', status: 'active' }]);

    const list = await service.findAll('t1');

    expect(prisma.sandboxEnvironment.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(list).toHaveLength(1);
  });
});
