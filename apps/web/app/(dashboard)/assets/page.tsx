'use client';

import Link from 'next/link';
import { useAssets } from '@/lib/hooks/benefits';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Briefcase, Search } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  AVAILABLE: 'success',
  ASSIGNED: 'warning',
  MAINTENANCE: 'destructive',
  RETIRED: 'secondary',
};

export default function AssetsPage() {
  const { rows: assets, total, page, setPage, search, setSearch, isLoading, error, refetch } = useAssets();

  const currentAssignee = (a: any) =>
    a.assignments?.find((as: any) => !as.returnedAt)?.employee;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
        <p className="text-sm text-muted-foreground">Kelola aset perusahaan</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari kode, nama, kategori…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && assets.length === 0 && (
        <EmptyState title="Belum ada aset" description="Aset akan muncul setelah ditambahkan." />
      )}

      {!isLoading && !error && assets.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Kode</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Kategori</th>
                    <th className="px-4 py-3 font-medium">Merek</th>
                    <th className="px-4 py-3 font-medium">Ditugaskan Ke</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assets.map((a: any) => {
                    const assignee = currentAssignee(a);
                    return (
                      <tr key={a.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{a.code}</td>
                        <td className="px-4 py-3">
                          <Link href={`/assets/${a.id}`} className="font-medium hover:underline">
                            {a.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{a.brand || '—'}</td>
                        <td className="px-4 py-3">{assignee ? assignee.fullName : '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={(statusVariant[a.status] || 'secondary') as any}>{a.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
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
