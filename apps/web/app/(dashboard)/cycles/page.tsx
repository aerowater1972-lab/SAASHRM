'use client';

import Link from 'next/link';
import { useCycles } from '@/lib/hooks/performance';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Search, RefreshCw } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  COMPLETED: 'warning',
  CANCELLED: 'destructive',
  UPCOMING: 'info',
};

export default function CyclesPage() {
  const { rows: cycles, total, page, setPage, search, setSearch, isLoading, error, refetch } = useCycles();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Siklus Review</h1>
        <p className="text-sm text-muted-foreground">Kelola periode dan siklus penilaian kinerja</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama, periode, status…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && cycles.length === 0 && (
        <EmptyState title="Belum ada siklus review" description="Buat siklus pertama untuk memulai penilaian kinerja." />
      )}

      {!isLoading && !error && cycles.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Periode</th>
                    <th className="px-4 py-3 font-medium">Review</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cycles.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/cycles/${c.id}`} className="font-medium hover:underline flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.period || '—'}</td>
                      <td className="px-4 py-3 text-xs">{c._count?.reviews ?? 0}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[c.status] || 'secondary') as any}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString('id-ID') : '—'} – {c.endDate ? new Date(c.endDate).toLocaleDateString('id-ID') : '—'}
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
