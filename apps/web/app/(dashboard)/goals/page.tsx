'use client';

import Link from 'next/link';
import { useGoals } from '@/lib/hooks/performance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, Search, Target } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  CANCELLED: 'destructive',
  NOT_STARTED: 'secondary',
  ON_TRACK: 'success',
  AT_RISK: 'warning',
  BEHIND: 'destructive',
};

export default function GoalsPage() {
  const { rows: goals, total, page, setPage, search, setSearch, isLoading, error, refetch } = useGoals();

  function progressPercent(g: any): number {
    if (!g.targetValue || g.targetValue === 0) return 0;
    return Math.min(100, Math.round(((g.actualValue || 0) / g.targetValue) * 100));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals & OKRs</h1>
          <p className="text-sm text-muted-foreground">Kelola tujuan dan hasil kerja karyawan</p>
        </div>
        <Link href="/goals/new">
          <Button><Plus className="mr-2 h-4 w-4" />Goal Baru</Button>
        </Link>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari judul, metrik, status…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={3} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && goals.length === 0 && (
        <EmptyState title="Belum ada goal" description="Buat goal pertama untuk melacak pencapaian." />
      )}

      {!isLoading && !error && goals.length > 0 && (
        <div className="grid gap-3">
          {goals.map((g: any) => {
            const pct = progressPercent(g);
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className="no-underline">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-sm font-semibold">{g.title}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {g.employee?.fullName} · {g.metric || '—'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={(statusVariant[g.status] || 'secondary') as any}>{g.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                        {g.actualValue ?? 0} / {g.targetValue ?? '—'} ({pct}%)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
    </div>
  );
}
