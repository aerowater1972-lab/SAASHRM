'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBankTransferBatches, useFlipDisbursements, useRetryFlipDisbursement } from '@/lib/hooks/payroll';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Download, RefreshCw, RotateCcw } from 'lucide-react';

interface Batch { id: string; payrollRunId: string; bankCode: string; fileUrl: string; status: string; generatedAt: string; run?: { period: string } }

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  generated: 'secondary', submitted: 'warning', confirmed: 'success', failed: 'destructive',
};

const flipStatusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  SUCCESS: 'success', PENDING: 'warning', DRAFT: 'secondary', FAILED: 'destructive', CANCELLED: 'destructive',
};

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

function FlipLiveSection() {
  const { data, isLoading, error, refetch } = useFlipDisbursements({ limit: 50 });
  const retryMutate = useRetryFlipDisbursement();
  const summary = data?.summary;
  const counts = summary?.counts ?? {};

  const cards: Array<{ label: string; value: number | string }> = [
    { label: 'Mode', value: data?.mode ?? '—' },
    { label: 'Success', value: counts.SUCCESS ?? 0 },
    { label: 'Pending', value: counts.PENDING ?? 0 },
    { label: 'Failed', value: counts.FAILED ?? 0 },
    { label: 'Total Nominal', value: summary ? `Rp${summary.totalAmount.toLocaleString('id-ID')}` : '—' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Flip Disbursement — Status Live</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()} aria-label="Muat ulang">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="text-lg font-semibold">{c.value}</div>
            </div>
          ))}
        </div>

        {error && <ErrorState onRetry={() => refetch()} />}
        {isLoading && <TableSkeleton rows={3} columns={5} />}

        {!isLoading && !error && (data?.items.length ?? 0) === 0 && (
          <EmptyState
            title="Belum ada disbursement"
            description="Jalankan disbursement dari payroll run (mode DRY_RUN aman tanpa kredensial Flip)."
          />
        )}

        {!isLoading && !error && (data?.items.length ?? 0) > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Rekening</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Percobaan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.items.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.accountName}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{d.bankCode}</TableCell>
                    <TableCell className="font-mono text-xs">{d.accountNumber}</TableCell>
                    <TableCell className="text-right">Rp{Number(d.amount).toLocaleString('id-ID')}</TableCell>
                    <TableCell>
                      <Badge variant={(flipStatusVariant[d.status] || 'secondary') as any}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>{d.attempts}</TableCell>
                    <TableCell className="text-right">
                      {d.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={retryMutate.isPending}
                          onClick={() => retryMutate.mutate(d.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" /> Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BankTransferBatchesPage() {
  const pathname = usePathname();
  const { data: batches = [], isLoading, error, refetch } = useBankTransferBatches();

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2 overflow-x-auto">
        {subPages.map((p) => {
          const isActive = p.exact ? pathname === p.href : pathname.startsWith(p.href);
          return (
            <Link key={p.href} href={p.href}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${isActive ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'}`}
            >{p.label}</Link>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-semibold">Bank Transfer Batches</h2>
        <p className="text-sm text-muted-foreground">Batch transfer bank untuk payroll</p>
      </div>

      {/* PD-05 — Status dashboard live Flip disbursement (poll 30s) */}
      <FlipLiveSection />

      {error && <ErrorState onRetry={() => refetch()} />}

      {isLoading && <TableSkeleton rows={5} columns={5} />}

      {!isLoading && !error && batches.length === 0 && (
        <EmptyState title="Belum ada batch transfer" description="Generate bank transfer dari payroll run untuk memulai." />
      )}

      {!isLoading && !error && batches.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.run?.period || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{b.bankCode}</TableCell>
                  <TableCell>
                    <a href={b.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(b.generatedAt).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell><Badge variant={(statusVariant[b.status] || 'secondary') as any}>{b.status.toUpperCase()}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
