'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useExpenseClaims } from '@/lib/hooks/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, Search } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
  PAID: 'info',
};

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useExpenseClaims({ page, limit: 20, q: search || undefined });

  const claims = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengeluaran</h1>
          <p className="text-sm text-muted-foreground">Kelola klaim pengeluaran karyawan</p>
        </div>
        <Link href="/expenses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Klaim Baru
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari judul atau status…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && claims.length === 0 && (
        <EmptyState
          title={search ? 'Tidak ada hasil' : 'Belum ada klaim'}
          description={search ? 'Tidak ada klaim yang sesuai filter.' : 'Belum ada klaim pengeluaran. Buat klaim baru untuk memulai.'}
        />
      )}

      {!isLoading && !error && claims.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/expenses/${c.id}`} className="font-medium text-primary hover:underline">{c.title}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.employee?.fullName || '—'}</TableCell>
                  <TableCell className="text-right font-mono">Rp {Number(c.totalAmount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <Badge variant={(statusVariant[c.status] || 'secondary') as any}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString('id-ID')}
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
