import { JurnalConnector, XeroConnector, AccurateConnector, QuickBooksConnector, GenericConnector } from './accounting-connector.service';

const entry = (sourceId = 'pay-1') => ({
  date: new Date('2026-09-30'),
  reference: 'PR-test',
  description: 'Jurnal Gaji Test',
  lines: [
    { accountCode: '6-1000', debit: 10_000_000, credit: 0, description: 'Gaji' },
    { accountCode: '1-1000', debit: 0, credit: 10_000_000, description: 'Bank' },
  ],
  sourceType: 'PAYROLL' as const,
  sourceId,
});

describe('Accounting connectors (live HTTP layer)', () => {
  it('Jurnal fails fast without API key (no network call)', async () => {
    const c = new JurnalConnector({}, { chartOfAccounts: {} });
    const r = await c.createJournalEntries([entry()]);
    expect(r.success).toBe(false);
    expect(r.recordsFailed).toBe(1);
    expect(r.errors[0]).toContain('API key');
  });

  it('Jurnal rejects non-https baseUrl', async () => {
    const c = new JurnalConnector({ apiKey: 'k', baseUrl: 'http://evil.local' }, { chartOfAccounts: {} });
    const r = await c.createJournalEntries([entry()]);
    expect(r.success).toBe(false);
    expect(r.errors[0]).toContain('https');
  });

  it('Xero surfaces reconnect guidance on missing token', async () => {
    const c = new XeroConnector({}, { chartOfAccounts: {} });
    const r = await c.createJournalEntries([entry()]);
    expect(r.success).toBe(false);
    expect(r.errors[0]).toContain('reconnect');
  });

  it('Xero health check is false without token', async () => {
    const c = new XeroConnector({}, { chartOfAccounts: {} });
    await expect(c.testConnection()).resolves.toBe(false);
  });

  it('Accurate fails fast without token', async () => {
    const c = new AccurateConnector({}, { chartOfAccounts: {} });
    const r = await c.createJournalEntries([entry()]);
    expect(r.success).toBe(false);
    expect(r.errors[0]).toContain('access token');
  });

  it('QuickBooks fails fast without realm/token', async () => {
    const c = new QuickBooksConnector({}, { chartOfAccounts: {} });
    const r = await c.createJournalEntries([entry()]);
    expect(r.success).toBe(false);
    expect(r.errors[0]).toContain('access token');
  });

  it('Generic connector stays a deterministic test double', async () => {
    const c = new GenericConnector({}, { chartOfAccounts: {} });
    const r = await c.createJournalEntries([entry('a'), entry('b')]);
    expect(r.success).toBe(true);
    expect(r.recordsSucceeded).toBe(2);
    expect(Object.keys(r.externalIds)).toEqual(['a', 'b']);
  });
});
