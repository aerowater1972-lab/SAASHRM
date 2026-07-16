'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLoans } from '@/lib/hooks/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, Search } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
};

export default function LoansPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useLoans({ page, limit: 20, q: search || undefined } as any);

  const loans = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pinjaman</h1>
          <p className="text-sm text-muted-foreground">Kelola pengajuan pinjaman karyawan</p>
        </div>
        <Link href="/loans/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Pinjaman Baru
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari tujuan atau status…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={6} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && loans.length === 0 && (
        <EmptyState
          title={search ? 'Tidak ada hasil' : 'Belum ada pinjaman'}
          description={search ? 'Tidak ada pinjaman yang sesuai filter.' : 'Belum ada pengajuan pinjaman.'}
        />
      )}

      {!isLoading && !error && loans.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tujuan</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Cicilan</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/loans/${l.id}`} className="font-medium text-primary hover:underline">
                      {l.purpose || 'Pinjaman'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.employee?.fullName || '—'}</TableCell>
                  <TableCell className="text-right font-mono">Rp {Number(l.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.installmentCount}× Rp {Number(l.installmentAmount).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right font-mono">Rp {Number(l.remainingBalance).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <Badge variant={(statusVariant[l.status] || 'secondary') as any}>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(l.createdAt).toLocaleDateString('id-ID')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
