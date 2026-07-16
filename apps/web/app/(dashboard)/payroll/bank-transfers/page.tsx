'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBankTransferBatches } from '@/lib/hooks/payroll';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Download } from 'lucide-react';

interface Batch { id: string; payrollRunId: string; bankCode: string; fileUrl: string; status: string; generatedAt: string; run?: { period: string } }

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  generated: 'secondary', submitted: 'warning', confirmed: 'success', failed: 'destructive',
};

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

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
