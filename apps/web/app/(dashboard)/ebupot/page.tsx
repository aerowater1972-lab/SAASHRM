'use client';
import { useState } from 'react';
import { useEbupotSubmissions, useEbupotStats, useGenerateEbupot, useSubmitEbupot, useRetryEbupot, useBulkRetryEbupot } from '@/lib/hooks/ebupot';
import { downloadEbupotExport } from '@/lib/api/ebupot';
import { usePermission } from '@/lib/hooks/use-permission';
import { RequirePermission } from '@/components/require-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';

function EbupotInner() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const { data = [], isLoading, error, refetch } = useEbupotSubmissions({ taxYear: year, taxMonth: month });
  const { data: stats } = useEbupotStats();
  const { allowed: canManage } = usePermission('ebupot:manage');
  const gen = useGenerateEbupot();
  const submitM = useSubmitEbupot();
  const retryM = useRetryEbupot();
  const bulkM = useBulkRetryEbupot();
  const failedIds: string[] = data.filter((s: any) => s.status === 'FAILED').map((s: any) => s.id);
  const busy = gen.isPending || submitM.isPending || retryM.isPending || bulkM.isPending;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg('');
    try { await fn(); setMsg(ok); refetch(); setSelected([]); }
    catch (e: any) { setMsg(e.message || 'Aksi gagal'); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">e-Bupot PPh 21</h1>
          <p className="text-sm text-muted-foreground">Generate & kelola bukti potong masa pajak</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => run(() => submitM.mutateAsync({ taxYear: year, taxMonth: month }), 'Submit ke Coretax berhasil.')}>
              {submitM.isPending ? 'Submitting…' : 'Submit Periode'}
            </Button>
            <Button onClick={() => run(() => gen.mutateAsync({ taxYear: year, taxMonth: month }), 'Generate berhasil.')} disabled={busy}>
              {gen.isPending ? 'Generating…' : 'Generate Periode Ini'}
            </Button>
          </div>
        )}
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Total', stats.total ?? 0], ['Draf', stats.byStatus?.DRAFT ?? 0], ['Siap', stats.byStatus?.READY ?? 0], ['Periode Berjalan', stats.currentPeriod?.count ?? 0]].map(([l, v]) => (
            <Card key={l as string}><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{v as number}</p>
              <p className="text-xs text-muted-foreground">{l as string}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input type="number" className="w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        <select className="rounded-md border px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Bulan {m}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={async () => { setMsg(''); try { await downloadEbupotExport('export.xml', year, month); } catch (e: any) { setMsg(e.message || 'Export gagal'); } }}>Export XML</Button>
        <Button variant="outline" size="sm" onClick={async () => { setMsg(''); try { await downloadEbupotExport('export.csv', year, month); } catch (e: any) { setMsg(e.message || 'Export gagal'); } }}>Export CSV</Button>
        {canManage && failedIds.length > 0 && (
          <Button variant="outline" size="sm" disabled={busy}
            onClick={() => run(() => bulkM.mutateAsync(selected.length ? selected : failedIds), 'Bulk retry berhasil.')}>
            Retry Gagal ({selected.length || failedIds.length})
          </Button>
        )}
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      {isLoading && <TableSkeleton columns={5} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && data.length === 0 && (
        <EmptyState title="Belum ada data" description="Generate e-Bupot untuk periode ini." />
      )}
      {!isLoading && !error && data.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              {canManage && <TableHead className="w-8"><input type="checkbox" aria-label="Pilih semua gagal"
                checked={failedIds.length > 0 && failedIds.every((id) => selected.includes(id))}
                onChange={() => setSelected((s) => (failedIds.every((id) => s.includes(id)) ? [] : failedIds))} /></TableHead>}
              <TableHead>Karyawan</TableHead><TableHead>NPWP</TableHead>
              <TableHead>Bruto</TableHead><TableHead>PPh</TableHead><TableHead>Status</TableHead>
              {canManage && <TableHead>Aksi</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {data.map((s: any) => (
                <TableRow key={s.id}>
                  {canManage && <TableCell><input type="checkbox" aria-label="Pilih baris" checked={selected.includes(s.id)}
                    onChange={() => setSelected((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))} /></TableCell>}
                  <TableCell className="font-medium">{s.employeeName || s.employee?.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{s.employee?.taxIdNumber || '—'}</TableCell>
                  <TableCell>{Number(s.grossIncome || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell>{Number(s.incomeTax || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant="secondary">{s.status}</Badge></TableCell>
                  {canManage && (
                    <TableCell>
                      {s.status === 'FAILED' && (
                        <Button size="sm" variant="outline" disabled={busy}
                          onClick={() => run(() => retryM.mutateAsync(s.id), 'Retry berhasil.')}>Retry</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function EbupotPage() {
  return <RequirePermission permission="ebupot:view"><EbupotInner /></RequirePermission>;
}
