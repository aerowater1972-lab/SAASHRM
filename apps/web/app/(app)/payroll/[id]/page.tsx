'use client';

import { useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

export default function PayrollDetailPage() {
  const params = useParams(); const router = useRouter(); const pathname = usePathname();
  const [actionLoading, setActionLoading] = useState(false);
  const [runName, setRunName] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: period, isLoading, error } = useQuery({
    queryKey: ['payroll-run', params.id],
    queryFn: () => api.get<any>(`/payroll/runs/${params.id}`),
  });

  async function handleClose() {
    setActionLoading(true); setActionError('');
    try { await api.post(`/payroll/periods/${params.id}/close`, {}); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleLock() {
    setActionLoading(true); setActionError('');
    try { await api.post(`/payroll/periods/${params.id}/lock`, {}); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleCreateRun() {
    if (!runName) return; setActionLoading(true); setActionError('');
    try {
      await api.post('/payroll/runs', { periodId: params.id, name: runName });
      setRunName('');
    } catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleRunAction(runId: string, action: string) {
    setActionLoading(true); setActionError('');
    try {
      const res = await api.post<any>(`/payroll/runs/${runId}/${action}`, {});
      if (action === 'generate-bank-transfer') {
        const blob = new Blob([res.content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `bank-transfer-${runId}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  if (isLoading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error?.message}</div>;
  if (!period) return <p>Not found</p>;

  return (
    <div>
      <div className="mb-4 flex gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
        <Link href="/payroll" className={`text-sm no-underline ${pathname === '/payroll' ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>Periods</Link>
        <Link href="/payroll/components" className={`text-sm no-underline ${pathname.startsWith('/payroll/components') ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>Components</Link>
        <Link href="/payroll/tax" className={`text-sm no-underline ${pathname.startsWith('/payroll/tax') ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>Tax</Link>
        <Link href="/payroll/bpjs" className={`text-sm no-underline ${pathname.startsWith('/payroll/bpjs') ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>BPJS</Link>
      </div>

      <Button variant="secondary" size="sm" onClick={() => router.back()} className="mb-4">← Back</Button>
      {actionError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}

      <Card className="mb-6 max-w-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="m-0">{period.name}</h3>
            <p className="m-0 mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(period.startDate).toLocaleDateString('id-ID')} – {new Date(period.endDate).toLocaleDateString('id-ID')}
            </p>
          </div>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
            period.status === 'CLOSED' ? 'bg-red-100 text-red-600' :
            period.status === 'LOCKED' ? 'bg-gray-100 text-gray-500' :
            'bg-green-100 text-green-600'
          }`}>{period.status}</span>
        </div>
        {period.status === 'OPEN' && (
          <div className="mt-4 flex gap-2">
            <Button variant="primary" size="sm" onClick={handleClose} disabled={actionLoading}>{actionLoading ? '…' : 'Close Period'}</Button>
            <Button variant="danger" size="sm" onClick={handleLock} disabled={actionLoading}>{actionLoading ? '…' : 'Lock Period'}</Button>
          </div>
        )}
      </Card>

      <h3 className="mb-3">Payroll Runs</h3>

      {period.status === 'OPEN' && (
        <div className="mb-4 flex max-w-sm gap-2">
          <input value={runName} onChange={(e) => setRunName(e.target.value)} placeholder="Run name (e.g. July 2026)" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          <Button variant="primary" size="md" onClick={handleCreateRun} disabled={!runName || actionLoading}>+ Create Run</Button>
        </div>
      )}

      {period.runs?.map((r: any) => (
        <Card key={r.id} className="mb-2 max-w-lg">
          <div className="flex items-center justify-between text-xs">
            <div><strong>{r.name}</strong></div>
            <div className="flex items-center gap-2">
              <span>{r.totalEmployees} emp · Rp {Number(r.totalAmount).toLocaleString('id-ID')}</span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] text-blue-600">{r.status}</span>
              {r.status === 'DRAFT' && (
                <Button variant="secondary" size="sm" onClick={() => handleRunAction(r.id, 'process')}>Process</Button>
              )}
              {r.status === 'COMPLETED' && (
                <Button variant="secondary" size="sm" onClick={() => handleRunAction(r.id, 'approve')}>Approve</Button>
              )}
              {r.status === 'APPROVED' && (
                <><Button variant="secondary" size="sm" onClick={() => handleRunAction(r.id, 'publish')}>Publish</Button>
                <Button variant="secondary" size="sm" onClick={() => handleRunAction(r.id, 'generate-bank-transfer')}>Bank File</Button></>
              )}
            </div>
          </div>
        </Card>
      ))}
      {period.runs?.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">No runs yet.</p>}
    </div>
  );
}
