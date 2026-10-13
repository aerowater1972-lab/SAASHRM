import { Test, TestingModule } from '@nestjs/testing';
import { FlipService } from './flip.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('FlipService', () => {
  const mockPrisma: any = {
    flipDisbursement: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), groupBy: jest.fn(), create: jest.fn(), update: jest.fn() },
    payrollRunItem: { findMany: jest.fn() },
  };

  const makeService = async (env: Record<string, string | undefined>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlipService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
      ],
    }).compile();
    return module.get<FlipService>(FlipService);
  };

  afterEach(() => jest.clearAllMocks());

  it('DRY_RUN tanpa kredensial: uang tak bergerak, payload tersimpan', async () => {
    const svc = await makeService({});
    expect(svc.mode).toBe('DRY_RUN');
    mockPrisma.flipDisbursement.findUnique.mockResolvedValue(null);
    mockPrisma.flipDisbursement.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'd-1', ...args.data }),
    );
    const rec: any = await svc.createDisbursement('t1', {
      bankCode: 'BCA', accountNumber: '123', accountName: 'Budi', amount: 5_000_000,
    });
    expect(rec.dryRun).toBe(true);
    expect(rec.status).toBe('DRAFT');
    expect(rec.bankCode).toBe('bca');
  });

  it('idempotency: kunci sama mengembalikan record lama', async () => {
    const svc = await makeService({});
    mockPrisma.flipDisbursement.findUnique.mockResolvedValue({ id: 'd-old', status: 'DRAFT' });
    const rec: any = await svc.createDisbursement('t1', {
      bankCode: 'BRI', accountNumber: '9', accountName: 'A', amount: 1, idempotencyKey: 'k-1',
    });
    expect(rec.id).toBe('d-old');
    expect(mockPrisma.flipDisbursement.create).not.toHaveBeenCalled();
  });

  it('validasi input: rekening kosong & nominal <= 0 ditolak', async () => {
    const svc = await makeService({});
    await expect(svc.createDisbursement('t1', { bankCode: 'BCA', accountNumber: ' ', accountName: 'x', amount: 1 }))
      .rejects.toThrow('rekening');
    await expect(svc.createDisbursement('t1', { bankCode: 'BCA', accountNumber: '1', accountName: 'x', amount: 0 }))
      .rejects.toThrow('Nominal');
  });

  it('bank code mapping + kunci stabil deterministik', async () => {
    const svc = await makeService({});
    expect(svc.toFlipBankCode('MANDIRI')).toBe('mandiri');
    expect(svc.toFlipBankCode('bni')).toBe('bni');
    expect(svc.toFlipBankCode('JATIM')).toBe('jatim');
    expect(svc.stableIdempotencyKey(['a', 1])).toBe(svc.stableIdempotencyKey(['a', 1]));
  });

  it('disbursePayrollRun melewati slip tanpa rekening', async () => {
    const svc = await makeService({});
    mockPrisma.payrollRunItem.findMany.mockResolvedValue([
      { id: 'i-1', netSalary: 100, employee: { id: 'e-1', fullName: 'A', bankName: 'BCA', bankAccountNumber: null } },
    ]);
    const res: any = await svc.disbursePayrollRun('t1', 'run-1');
    expect(res.total).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results[0].error).toContain('rekening');
  });

  // --- PD-05: status dashboard live ---
  it('listDisbursements: mengembalikan ringkasan per status + item', async () => {
    const svc = await makeService({});
    mockPrisma.flipDisbursement.findMany.mockResolvedValue([{ id: 'd-1', status: 'SUCCESS' }]);
    mockPrisma.flipDisbursement.groupBy.mockResolvedValue([
      { status: 'SUCCESS', _count: { _all: 2 }, _sum: { amount: 10_000_000 } },
      { status: 'FAILED', _count: { _all: 1 }, _sum: { amount: 5_000_000 } },
    ]);
    const res: any = await svc.listDisbursements('t1', { limit: 10 });
    expect(res.mode).toBe('DRY_RUN');
    expect(res.summary.counts).toEqual({ SUCCESS: 2, FAILED: 1 });
    expect(res.summary.totalAmount).toBe(15_000_000);
    expect(res.items).toHaveLength(1);
  });

  // --- PD-04: retry manual ---
  it('retryDisbursement: hanya FAILED & memperbarui attempts', async () => {
    const svc = await makeService({});
    mockPrisma.flipDisbursement.findFirst.mockResolvedValue({
      id: 'd-1', tenantId: 't1', status: 'FAILED', attempts: 0,
      idempotencyKey: 'k-1', bankCode: 'bca', accountNumber: '123', accountName: 'A',
      amount: 5000, remark: 'Gaji', payrollRunId: null,
    });
    mockPrisma.flipDisbursement.findUnique.mockResolvedValue(null); // kunci retry belum ada
    mockPrisma.flipDisbursement.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'd-retry', ...args.data }),
    );
    const res: any = await svc.retryDisbursement('t1', 'd-1');
    expect(mockPrisma.flipDisbursement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: 'retry:k-1:1' }),
      }),
    );
    expect(mockPrisma.flipDisbursement.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: 1 } }),
    );
    expect(res.retry.id).toBe('d-retry');
  });

  it('retryDisbursement: menolak status non-FAILED & melebihi batas', async () => {
    const svc = await makeService({});
    mockPrisma.flipDisbursement.findFirst.mockResolvedValue({ id: 'd-2', status: 'PENDING', attempts: 0 });
    await expect(svc.retryDisbursement('t1', 'd-2')).rejects.toThrow('FAILED');
    mockPrisma.flipDisbursement.findFirst.mockResolvedValue({ id: 'd-3', status: 'FAILED', attempts: 99 });
    await expect(svc.retryDisbursement('t1', 'd-3')).rejects.toThrow('Batas retry');
  });

  // --- PD-03: rekonsiliasi batch ---
  it('reconcilePending: no-op saat DRY_RUN (uang tidak bergerak)', async () => {
    const svc = await makeService({});
    const res: any = await svc.reconcilePending();
    expect(res).toEqual({ checked: 0, done: 0, failed: 0 });
    expect(mockPrisma.flipDisbursement.findMany).not.toHaveBeenCalled();
  });

  it('autoRetryFailed: no-op saat DRY_RUN', async () => {
    const svc = await makeService({});
    const res: any = await svc.autoRetryFailed();
    expect(res).toEqual({ retried: 0, skipped: 0 });
  });
});
