'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRuns } from '@/lib/hooks/payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Search, Download } from 'lucide-react';
import type { PayrollRun } from '@/lib/types';

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  APPROVED: 'info',
  CANCELLED: 'destructive',
};

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/components', label: 'Components' },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

export default function PayrollPage() {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useRuns({ page, limit: 20, q: search || undefined } as any);

  const periods = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
        <p className="text-sm text-muted-foreground">Kelola periode penggajian, komponen, BPJS, dan PPh 21</p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 border-b pb-2 overflow-x-auto">
        {subPages.map((p) => {
          const isActive = p.exact ? pathname === p.href : pathname.startsWith(p.href);
          return (
            <Link
              key={p.href}
              href={p.href}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${
                isActive
                  ? 'bg-card text-foreground border border-b-0 border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, status…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && periods.length === 0 && (
        <EmptyState title="Belum ada periode payroll" description="Buat periode penggajian baru untuk memulai." />
      )}

      {!isLoading && !error && periods.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Karyawan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/payroll/${p.id}`} className="font-medium text-primary hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.startDate).toLocaleDateString('id-ID')} – {new Date(p.endDate).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(statusVariant[p.status] || 'secondary') as any}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{p.totalEmployees ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(data?.meta?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Halaman {page} dari {data?.meta?.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <Button variant="outline" size="sm" disabled={page >= (data?.meta?.totalPages ?? 0)} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
