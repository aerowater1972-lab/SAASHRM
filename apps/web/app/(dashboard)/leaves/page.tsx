'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLeaveRequests, useLeaveBalances, useApproveLeaveRequest, useRejectLeaveRequest } from '@/lib/hooks/leave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, Search, CalendarDays } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
};

export default function LeavesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: requestsData, isLoading, error, refetch } = useLeaveRequests({ page, limit: 20, q: search || undefined });
  const { data: balances = [], error: balError } = useLeaveBalances();

  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();

  const requests = requestsData?.data ?? [];
  const total = requestsData?.meta?.total ?? 0;
  const errorMessage = error instanceof Error ? error.message : (balError instanceof Error ? balError.message : '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuti</h1>
          <p className="text-sm text-muted-foreground">Kelola pengajuan cuti dan saldo cuti karyawan</p>
        </div>
        <Link href="/leaves/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Ajukan Cuti
          </Button>
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div>
      )}

      {/* Leave Balances */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Saldo Cuti
        </h3>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada saldo cuti.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {balances.map((b: any) => (
              <Card key={b.id}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{b.leaveType?.name || b.leaveTypeId}</p>
                  <p className="text-3xl font-bold text-primary">
                    {(b.totalEntitled || 0) - (b.totalUsed || 0) - (b.totalPending || 0) + (b.carryForward || 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.totalUsed || 0} terpakai &middot; {b.totalPending || 0} pending
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Leave Requests */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Pengajuan Cuti</h3>
        <div className="relative max-w-sm mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari status…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        {isLoading && <TableSkeleton rows={5} columns={5} />}
        {error && !isLoading && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !error && requests.length === 0 && (
          <EmptyState
            title={search ? 'Tidak ada hasil' : 'Belum ada pengajuan cuti'}
            description={search ? 'Tidak ada cuti yang sesuai filter.' : 'Belum ada pengajuan cuti. Ajukan cuti untuk memulai.'}
          />
        )}

        {!isLoading && !error && requests.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hari</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Karyawan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/leaves/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.leaveType?.name || r.leaveTypeId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.startDate).toLocaleDateString('id-ID')} – {new Date(r.endDate).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>{r.totalDays}</TableCell>
                    <TableCell>
                      <Badge variant={(statusVariant[r.status] || 'secondary') as any}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.employee?.fullName || '—'}</TableCell>
                    <TableCell className="text-right">
                      {r.status === 'PENDING' && (
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => approveMutation.mutate(r.id, { onSuccess: () => refetch() })}>
                            Setujui
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => rejectMutation.mutate({ id: r.id, reason: '' }, { onSuccess: () => refetch() })}>
                            Tolak
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {requestsData?.meta && requestsData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Halaman {requestsData.meta.page} dari {requestsData.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Sebelumnya
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= (requestsData.meta.totalPages || 1)} onClick={() => setPage(page + 1)}>
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
