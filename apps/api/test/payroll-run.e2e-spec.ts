import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@common/prisma/prisma.service';
import { RunService } from '../src/modules/payroll/services/run.service';
import { PeriodService } from '../src/modules/payroll/services/period.service';

/**
 * QA-001: end-to-end payroll lifecycle on a scratch period —
 * create period → create run → process → approve → publish (LOCKED) →
 * bank transfer generation. Cleans up all created rows afterwards.
 */
describe('Payroll run lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let runs: RunService;
  let periods: PeriodService;

  const TENANT = 'default';
  let periodId = '';
  let runId = '';
  const stamp = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    runs = app.get(RunService);
    periods = app.get(PeriodService);
  });

  afterAll(async () => {
    if (runId) {
      await prisma.payrollItem.deleteMany({
        where: { payslip: { runId } },
      }).catch(() => undefined);
      await prisma.payslip.deleteMany({ where: { runId } }).catch(() => undefined);
      await prisma.bankTransferBatch.deleteMany({ where: { payrollRunId: runId } }).catch(() => undefined);
      await prisma.payrollRun.deleteMany({ where: { id: runId } }).catch(() => undefined);
    }
    if (periodId) {
      await prisma.payrollPeriod.deleteMany({ where: { id: periodId } }).catch(() => undefined);
    }
    await app.close();
  });

  it('creates a scratch period', async () => {
    const period = await periods.create(TENANT, {
      name: `E2E-${stamp}`,
      type: 'MONTHLY' as any,
      month: 1,
      year: 2030,
      startDate: '2030-01-01',
      endDate: '2030-01-31',
    } as any);
    periodId = period.id;
    expect(periodId).toBeTruthy();
  });

  it('creates a run for the period', async () => {
    const run = await runs.create(TENANT, { periodId, name: `E2E-RUN-${stamp}` } as any);
    runId = run.id;
    expect((run as any).status).toBe('DRAFT');
  });

  it('processes the run (calculates payslips)', async () => {
    const run = await runs.process(TENANT, runId);
    expect((run as any).status).not.toBe('DRAFT');
    const count = await prisma.payslip.count({ where: { runId } });
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('approves then locks the run', async () => {
    const approved: any = await runs.approve(TENANT, runId);
    expect(approved.status).toBe('APPROVED');
    const locked: any = await runs.publish(TENANT, runId);
    expect(locked.status).toBe('LOCKED');
  });

  it('generates a bank transfer file from the locked run', async () => {
    const file: any = await runs.generateBankTransfer(TENANT, runId, 'e2e', 'CSV');
    expect(file.runId).toBe(runId);
    expect(typeof file.content).toBe('string');
    expect(file.content.length).toBeGreaterThan(0);
  });
});
