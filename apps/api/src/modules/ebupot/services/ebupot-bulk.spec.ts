import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma/prisma.service';
import { EbupotService } from './ebupot.service';

describe('EbupotService.bulkGenerate (EB bulk UAT)', () => {
  const TENANT = 't-1';

  const setup = async () => {
    const prisma: any = {};
    const mod = await Test.createTestingModule({
      providers: [EbupotService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    return mod.get(EbupotService);
  };

  it('menggabungkan hasil sukses + gagal per periode', async () => {
    const svc = await setup();
    const gen = jest
      .spyOn(svc, 'generate')
      .mockResolvedValueOnce({ taxYear: 2026, taxMonth: 1, generated: 3, skipped: 0, submissions: [] } as any)
      .mockRejectedValueOnce(new Error('Tidak ada payroll run APPROVED/LOCKED untuk masa pajak ini'));
    const r = await svc.bulkGenerate(TENANT, [
      { taxYear: 2026, taxMonth: 1 },
      { taxYear: 2026, taxMonth: 2 },
    ]);
    expect(r.generated).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.results).toHaveLength(2);
    expect(r.results[0].success).toBe(true);
    expect(r.results[0].count).toBe(3);
    expect(r.results[1].success).toBe(false);
    expect(r.results[1].error).toBeTruthy();
    gen.mockRestore();
  });

  it('menolak daftar periode kosong dan membatasi 24 periode', async () => {
    const svc = await setup();
    await expect(svc.bulkGenerate(TENANT, [])).rejects.toThrow();
    const gen = jest.spyOn(svc, 'generate').mockResolvedValue({ generated: 1 } as any);
    const many = Array.from({ length: 30 }, (_, i) => ({ taxYear: 2026, taxMonth: (i % 12) + 1 }));
    const r = await svc.bulkGenerate(TENANT, many);
    expect(gen).toHaveBeenCalledTimes(24);
    expect(r.results).toHaveLength(24);
    gen.mockRestore();
  });
});
