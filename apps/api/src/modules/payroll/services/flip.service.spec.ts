import { Test, TestingModule } from '@nestjs/testing';
import { FlipService } from './flip.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('FlipService', () => {
  const mockPrisma: any = {
    flipDisbursement: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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
});
