'use client';

import Link from 'next/link';
import { useJobList } from '@/lib/hooks/recruitment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Search } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  OPEN: 'success',
  DRAFT: 'secondary',
  CLOSED: 'destructive',
  ON_HOLD: 'warning',
  FILLED: 'info',
};

export default function JobsPage() {
  const { rows: jobs, total, page, setPage, search, setSearch, isLoading, error, refetch } = useJobList();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lowongan Pekerjaan</h1>
          <p className="text-sm text-muted-foreground">Kelola postingan lowongan dan rekrutmen</p>
        </div>
        <Link href="/jobs/new">
          <Button><Plus className="mr-2 h-4 w-4" />Lowongan Baru</Button>
        </Link>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari judul, tipe, lokasi…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={6} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && jobs.length === 0 && (
        <EmptyState title="Belum ada lowongan" description="Buat lowongan pertama untuk mulai rekrutmen." />
      )}

      {!isLoading && !error && jobs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Judul</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Lokasi</th>
                    <th className="px-4 py-3 font-medium">Slot</th>
                    <th className="px-4 py-3 font-medium">Pelamar</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jobs.map((j: any) => (
                    <tr key={j.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">{j.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{j.employmentType?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{j.location || '—'}</td>
                      <td className="px-4 py-3 text-xs">{j.filledSlots || 0}/{j.slots}</td>
                      <td className="px-4 py-3 text-xs">{j.applications?.length || 0}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[j.status] || 'secondary') as any}>{j.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(j.createdAt).toLocaleDateString('id-ID')}
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
