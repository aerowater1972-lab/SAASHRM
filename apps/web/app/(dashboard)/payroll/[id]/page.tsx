'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRun, useRunSummary, usePayslips, useProcessRun, useApproveRun, usePublishRun, useGenerateRunBankTransfer } from '@/lib/hooks/payroll';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, DollarSign, Users, AlertTriangle, Download } from 'lucide-react';

const runStatusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary', PROCESSING: 'warning', COMPLETED: 'success', APPROVED: 'info', CANCELLED: 'destructive',
  OPEN: 'secondary', CLOSED: 'destructive', LOCKED: 'secondary',
};

export default function PayrollRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const processMutate = useProcessRun();
  const approveMutate = useApproveRun();
  const publishMutate = usePublishRun();
  const bankTransferMutate = useGenerateRunBankTransfer();

  const { data: run, isLoading, error, refetch } = useRun(params.id as string);
  const { data: summary } = useRunSummary(params.id as string);
  const { data: payslips, isLoading: isLoadingPayslips } = usePayslips({ runId: params.id as string, page, limit: 20 });

  if (isLoading) return <PageSkeleton />;
  if (error || !run) return <ErrorState message={error instanceof Error ? error.message : 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  const s = summary as Record<string, number> | undefined;
  const rows = (payslips?.data ?? []) as any[];
  const totalPages = payslips?.meta?.totalPages ?? 1;
  const exceptionCount = s?.['exceptionCount'] ?? (rows.filter((r) => r.status === 'DRAFT').length);

  async function handleRunAction(action: string) {
    setActionLoading(true); setActionError('');
    try {
      if (action === 'process') await processMutate.mutateAsync(params.id as string);
      else if (action === 'approve') await approveMutate.mutateAsync(params.id as string);
      else if (action === 'publish') await publishMutate.mutateAsync(params.id as string);
      else if (action === 'generate-bank-transfer') {
        const res = await bankTransferMutate.mutateAsync(params.id as string);
        const blob = new Blob([JSON.stringify(res)], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `bank-transfer-${params.id}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
      refetch();
    } catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{run.name}</h1>
          <p className="text-sm text-muted-foreground">Detail payroll run</p>
        </div>
        <Badge variant={runStatusVariant[run.status] || 'secondary'} className="ml-auto">{run.status}</Badge>
      </div>

      {actionError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</div>}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Gross</p></div><p className="mt-1 text-xl font-bold">Rp {Number(s?.['totalGross'] || 0).toLocaleString('id-ID')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Net</p></div><p className="mt-1 text-xl font-bold">Rp {Number(s?.['totalNet'] || 0).toLocaleString('id-ID')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">BPJS + PPh21</p></div><p className="mt-1 text-xl font-bold">Rp {Number((s?.['totalBpjs'] || 0) + (s?.['totalTax'] || 0)).toLocaleString('id-ID')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Jumlah Karyawan</p></div><p className="mt-1 text-xl font-bold">{run.totalEmployees ?? 0}</p></CardContent></Card>
      </div>

      {/* Exception banner */}
      {exceptionCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <span>{exceptionCount} karyawan memiliki data tidak lengkap. Periksa sebelum memproses.</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {run.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => handleRunAction('process')} disabled={actionLoading}>Process All</Button>}
        {run.status === 'COMPLETED' && <Button variant="outline" size="sm" onClick={() => handleRunAction('approve')} disabled={actionLoading}>Approve All</Button>}
        {run.status === 'APPROVED' && (
          <>
            <Button variant="outline" size="sm" onClick={() => handleRunAction('publish')} disabled={actionLoading}>Generate Payslips</Button>
            <Button variant="outline" size="sm" onClick={() => handleRunAction('generate-bank-transfer')} disabled={actionLoading}><Download className="mr-1 h-4 w-4" />Bank File</Button>
          </>
        )}
      </div>

      {/* Employee table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Rincian Karyawan</CardTitle></CardHeader>
        <CardContent>
          {isLoadingPayslips ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada payslip untuk run ini.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead className="text-right">BPJS</TableHead>
                    <TableHead className="text-right">PPh21</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employee?.fullName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.employee?.employeeId ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">Rp {Number(r.grossPay || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-mono text-xs">Rp {Number(r.totalDeductions || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-mono text-xs">Rp {Number(r.bpjsTotal || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-mono text-xs">Rp {Number(r.taxTotal || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-mono text-xs">Rp {Number(r.netPay || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell><Badge variant={runStatusVariant[r.status] || 'secondary'} className="text-[10px]">{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Selanjutnya</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
