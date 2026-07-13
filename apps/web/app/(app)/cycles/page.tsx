'use client';

import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Pagination } from '@/components/ui';

interface Cycle {
  id: string; name: string; period?: string; status: string;
  startDate?: string; endDate?: string;
  _count?: { reviews: number };
}

export default function CyclesPage() {
  const { rows: cycles, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<Cycle>(['cycles'], ({ page, limit, q }) =>
      api.get('/performance/cycles', { params: { page, limit, q } }),
    );

  return (
    <div>
      <h2 className="mt-0">Review Cycles</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search name, period, status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
              <th className="py-2">Name</th><th>Period</th><th>Reviews</th><th>Status</th><th>Dates</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c: any) => (
              <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5"><Link href={`/cycles/${c.id}`}>{c.name}</Link></td>
                <td>{c.period || '—'}</td>
                <td>{c._count?.reviews ?? 0}</td>
                <td>{c.status}</td>
                <td>{c.startDate ? new Date(c.startDate).toLocaleDateString('id-ID') : '—'} – {c.endDate ? new Date(c.endDate).toLocaleDateString('id-ID') : '—'}</td>
              </tr>
            ))}
            {cycles.length === 0 && <tr><td colSpan={5} className="py-2.5 text-gray-500 dark:text-gray-400">No cycles.</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
