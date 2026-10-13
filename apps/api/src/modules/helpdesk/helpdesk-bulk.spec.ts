import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { HelpdeskTicketService } from './helpdesk-ticket.service';

function buildPrismaMock() {
  return {
    user: { findFirst: jest.fn() },
    helpdeskTicket: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('HelpdeskTicketService bulk (HD-04)', () => {
  const TENANT = 't-1';

  const setup = async (prisma: any) => {
    const mod = await Test.createTestingModule({
      providers: [HelpdeskTicketService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    return mod.get(HelpdeskTicketService);
  };

  it('bulkAssign: meng-assign semua ticket OPEN dan pindah ke IN_PROGRESS', async () => {
    const prisma = buildPrismaMock();
    prisma.helpdeskTicket.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve({ id: where.id, status: 'OPEN' }),
    );
    prisma.user.findFirst.mockResolvedValue({ id: 'hr-1' });
    prisma.helpdeskTicket.update.mockImplementation(({ where }: any) =>
      Promise.resolve({ id: where.id, status: 'IN_PROGRESS' }),
    );
    const svc = await setup(prisma);
    const r = await svc.bulkAssign(TENANT, ['t1', 't2'], 'hr-1');
    expect(r.updated).toBe(2);
    expect(r.failed).toBe(0);
  });

  it('bulkAssign: partial failure dilaporkan per-ticket', async () => {
    const prisma = buildPrismaMock();
    prisma.helpdeskTicket.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(where.id === 't1' ? { id: 't1', status: 'OPEN' } : null),
    );
    prisma.user.findFirst.mockResolvedValue({ id: 'hr-1' });
    prisma.helpdeskTicket.update.mockImplementation(({ where }: any) =>
      Promise.resolve({ id: where.id }),
    );
    const svc = await setup(prisma);
    const r = await svc.bulkAssign(TENANT, ['t1', 'missing'], 'hr-1');
    expect(r.updated).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.results.find((x) => x.id === 'missing')?.success).toBe(false);
  });

  it('bulkUpdateStatus: menolak status tidak valid dan id kosong', async () => {
    const prisma = buildPrismaMock();
    const svc = await setup(prisma);
    await expect(svc.bulkUpdateStatus(TENANT, ['t1'], 'BOGUS' as any)).rejects.toThrow();
    await expect(svc.bulkUpdateStatus(TENANT, [], 'CLOSED' as any)).rejects.toThrow();
  });

  it('bulkUpdateStatus: sukses untuk transisi valid', async () => {
    const prisma = buildPrismaMock();
    prisma.helpdeskTicket.findFirst.mockResolvedValue({ id: 't1', status: 'OPEN' });
    prisma.helpdeskTicket.update.mockResolvedValue({ id: 't1', status: 'IN_PROGRESS' });
    const svc = await setup(prisma);
    const r = await svc.bulkUpdateStatus(TENANT, ['t1'], 'IN_PROGRESS' as any);
    expect(r.updated).toBe(1);
    expect(r.failed).toBe(0);
  });
});
