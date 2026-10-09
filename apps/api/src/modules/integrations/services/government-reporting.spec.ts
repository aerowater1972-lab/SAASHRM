import { Test, TestingModule } from '@nestjs/testing';
import { GovernmentReportingService } from './government-reporting.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('GovernmentReportingService (submission flow)', () => {
  let service: GovernmentReportingService;
  const store: Record<string, any> = {};
  const mockPrisma: any = {
    governmentReport: {
      findUnique: jest.fn((args: any) => Promise.resolve(store[args.where.id] ?? null)),
      update: jest.fn((args: any) => {
        store[args.where.id] = { ...(store[args.where.id] ?? { id: args.where.id }), ...args.data };
        return Promise.resolve(store[args.where.id]);
      }),
    },
    thrRun: { findMany: jest.fn(() => Promise.resolve([])) },
  };

  beforeEach(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [GovernmentReportingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(GovernmentReportingService);
    jest.clearAllMocks();
  });

  it('provides a guide for every report type', () => {
    const types = [
      'DJP_SPT_1721_A1',
      'DJP_SPT_MASA_PPH21',
      'DJP_EBUPOT_UNIFIKASI',
      'BPJS_KESEHATAN_IURAN',
      'BPJS_KETENAGAKERJAAN_IURAN',
      'SIPP_LAPORAN_TENAGA_KERJA',
    ] as const;
    for (const t of types) {
      const g: any = service.getSubmissionGuide(t);
      expect(g.portal).toBeTruthy();
      expect(g.url).toMatch(/^https:\/\//);
      expect(g.steps.length).toBeGreaterThan(0);
      expect(g.deadline).toBeTruthy();
    }
  });

  it('rejects unknown guide type', () => {
    expect(() => service.getSubmissionGuide('NOPE' as any)).toThrow();
  });

  it('calendar carries statutory dues (PPh tgl 10/20, BPJS Kes 10, TK 15)', async () => {
    const cal: any = await service.getComplianceCalendar('t1', 2026, 10);
    const has = (ob: string, kind: string, due: string) =>
      cal.items.some((i: any) => i.obligation === ob && i.kind === kind && i.dueDate === due);
    expect(has('PPh 21 Masa', 'SETOR', '2026-10-10')).toBe(true);
    expect(has('PPh 21 Masa', 'LAPOR', '2026-10-20')).toBe(true);
    expect(has('BPJS Kesehatan', 'BAYAR', '2026-10-10')).toBe(true);
    expect(has('BPJS Ketenagakerjaan', 'BAYAR', '2026-10-15')).toBe(true);
  });

  it('calendar adds 1721-A1 handover in January', async () => {
    const cal: any = await service.getComplianceCalendar('t1', 2026, 1);
    expect(cal.items.some((i: any) => i.obligation.includes('1721-A1'))).toBe(true);
  });

  it('accept/reject enforce SUBMITTED state machine', async () => {
    store['r1'] = { id: 'r1', status: 'GENERATED' };
    await expect(service.markAccepted('r1')).rejects.toThrow('SUBMITTED');
    await expect(service.markRejected('r1', 'x')).rejects.toThrow('SUBMITTED');
    store['r1'] = { id: 'r1', status: 'SUBMITTED' };
    const ok = await service.markAccepted('r1');
    expect(ok.status).toBe('ACCEPTED');
    store['r2'] = { id: 'r2', status: 'SUBMITTED' };
    await expect(service.markRejected('r2', '')).rejects.toThrow('Alasan');
    const rej = await service.markRejected('r2', 'BPE tidak terbaca');
    expect(rej.status).toBe('REJECTED');
  });
});
