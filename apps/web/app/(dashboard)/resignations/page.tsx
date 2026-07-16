'use client';

import Link from 'next/link';
import { useResignations } from '@/lib/hooks/benefits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Search, LogOut } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
  AWAITING_HR: 'warning',
  AWAITING_MANAGER: 'warning',
  COMPLETED: 'success',
};

export default function ResignationsPage() {
  const { rows: requests, total, page, setPage, search, setSearch, isLoading, error, refetch } = useResignations();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resignasi & Offboarding</h1>
          <p className="text-sm text-muted-foreground">Kelola pengajuan resignasi dan proses offboarding</p>
        </div>
        <Link href="/resignations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Pengajuan Baru
          </Button>
        </Link>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari tipe, alasan, status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && requests.length === 0 && (
        <EmptyState title="Belum ada pengajuan resignasi" description="Pengajuan akan muncul setelah diajukan oleh karyawan." />
      )}

      {!isLoading && !error && requests.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Karyawan</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Alasan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tanggal Efektif</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/resignations/${r.id}`} className="font-medium hover:underline">
                          {r.employee?.fullName || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[r.status] || 'secondary') as any}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString('id-ID') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
    </div>
  );
}
