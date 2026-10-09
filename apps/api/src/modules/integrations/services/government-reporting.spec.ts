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

describe('GovernmentReportingService (pembetulan)', () => {
  const store: Record<string, any> = {};
  const mockPrisma: any = {
    governmentReport: {
      findUnique: jest.fn((args: any) => {
        if (args.include?.revisions) {
          const base = store[args.where.id];
          return Promise.resolve(base ? {
            ...base,
            revisions: Object.values(store).filter((r: any) => r.revisionOfId === base.id),
            config: { tenantId: 't1', reportType: 'DJP_SPT_1721_A1' },
          } : null);
        }
        return Promise.resolve(store[args.where.id] ?? null);
      }),
      create: jest.fn((args: any) => {
        const rec = { id: 'new-' + Math.floor(Math.random() * 1e6), ...args.data };
        store[rec.id] = rec;
        return Promise.resolve(rec);
      }),
      findMany: jest.fn((args: any) => Promise.resolve(
        Object.values(store).filter((r: any) => r.revisionOfId === args.where.revisionOfId),
      )),
    },
    annualTaxRecord: { findMany: jest.fn(() => Promise.resolve([])) },
  };
  let service: GovernmentReportingService;

  beforeEach(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [GovernmentReportingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(GovernmentReportingService);
    jest.clearAllMocks();
  });

  it('creates chained correction with rising revisionNo', async () => {
    store['orig'] = {
      id: 'orig', status: 'ACCEPTED', configId: 'c1',
      periodStart: new Date('2026-09-01'), periodEnd: new Date('2026-09-30'),
      submissionRef: 'BPE-1', fileHash: 'abc',
    };
    const p1: any = await service.createCorrection('orig');
    expect(p1.revisionNo).toBe(1);
    expect(p1.revisionOfId).toBe('orig');
    expect(p1.payload.isCorrection).toBe(true);
    expect(p1.payload.originalSubmissionRef).toBe('BPE-1');
    expect(p1.fileName).toContain('-P1.csv');
    const p2: any = await service.createCorrection('orig');
    expect(p2.revisionNo).toBe(2);
  });

  it('rejects correction from non-submitted or from another correction', async () => {
    store['draft'] = { id: 'draft', status: 'GENERATED', configId: 'c1' };
    await expect(service.createCorrection('draft')).rejects.toThrow('dilapor');
    store['p1'] = { id: 'p1', status: 'ACCEPTED', configId: 'c1', revisionOfId: 'orig' };
    await expect(service.createCorrection('p1')).rejects.toThrow('laporan normal');
    await expect(service.createCorrection('missing')).rejects.toThrow('not found');
  });

  it('lists revision chain', async () => {
    store['orig'] = { id: 'orig', status: 'ACCEPTED', revisionNo: 0 };
    store['p1'] = { id: 'p1', status: 'GENERATED', revisionOfId: 'orig', revisionNo: 1 };
    const chain: any = await service.listRevisions('orig');
    expect(chain.original.id).toBe('orig');
    expect(chain.revisions.map((r: any) => r.revisionNo)).toEqual([1]);
  });
});
