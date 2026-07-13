'use client';

import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Button, Card, Pagination } from '@/components/ui';

interface Goal {
  id: string;
  title: string;
  description?: string;
  metric?: string;
  targetValue?: number;
  actualValue?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt: string;
  employee: { id: string; fullName: string; employeeId: string };
}

export default function GoalsPage() {
  const { rows: goals, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<Goal>(['goals'], ({ page, limit, q }) =>
      api.get('/performance/goals', { params: { page, limit, q } }),
    );

  function progressPercent(g: Goal): number {
    if (!g.targetValue || g.targetValue === 0) return 0;
    return Math.min(100, Math.round(((g.actualValue || 0) / g.targetValue) * 100));
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="mt-0">Goals & OKRs</h2>
        <Link href="/goals/new"><Button>+ New Goal</Button></Link>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search title, metric, status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <div className="grid gap-3">
          {goals.map((g: any) => {
            const pct = progressPercent(g);
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className="no-underline">
                <Card className="cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="m-0">{g.title}</h4>
                      <p className="m-0.5 text-gray-500 dark:text-gray-400 text-xs">
                        {g.employee.fullName} · {g.metric || '—'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      g.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      g.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      g.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                      }`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 min-w-[50px] text-right">
                      {g.actualValue ?? 0} / {g.targetValue ?? '—'} ({pct}%)
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
          {goals.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No goals found.</p>
          )}
          </div>
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
