'use client';

import Link from 'next/link';
import { useReviews } from '@/lib/hooks/performance';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Search, Star } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  DRAFT: 'secondary',
  CANCELLED: 'destructive',
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
};

export default function ReviewsPage() {
  const { rows: reviews, total, page, setPage, search, setSearch, isLoading, error, refetch } = useReviews();

  const avgScore = (r: any) => {
    if (!r.ratings?.length) return null;
    const sum = r.ratings.reduce((a: any, b: any) => a + Number(b.score), 0);
    return (sum / r.ratings.length).toFixed(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance Reviews</h1>
        <p className="text-sm text-muted-foreground">Kelola penilaian kinerja karyawan</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari status, ringkasan…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && reviews.length === 0 && (
        <EmptyState title="Belum ada review" description="Review akan muncul setelah siklus review dimulai." />
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Karyawan</th>
                    <th className="px-4 py-3 font-medium">Siklus</th>
                    <th className="px-4 py-3 font-medium">Skor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Diajukan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reviews.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/reviews/${r.id}`} className="font-medium hover:underline">
                          {r.employee?.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.cycle?.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          <span>{avgScore(r) || r.overallScore ? Number(r.overallScore || avgScore(r)).toFixed(1) : '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[r.status] || 'secondary') as any}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('id-ID') : '—'}
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
