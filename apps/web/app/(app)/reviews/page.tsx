'use client';

import Link from 'next/link';
import { Pagination } from '@/components/ui';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';

interface Review {
  id: string;
  overallScore?: number;
  summary?: string;
  status: string;
  submittedAt?: string;
  createdAt: string;
  employee: { id: string; fullName: string; employeeId: string };
  cycle: { id: string; name: string; period?: string };
  ratings: { id: string; competency: string; score: number }[];
}

export default function ReviewsPage() {
  const { rows: reviews, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<Review>(['reviews'], ({ page, limit, q }) =>
      api.get('/reviews', { params: { page, limit, q } }),
    );

  const avgScore = (r: Review) => {
    if (!r.ratings?.length) return null;
    const sum = r.ratings.reduce((a: any, b: any) => a + Number(b.score), 0);
    return (sum / r.ratings.length).toFixed(1);
  };

  return (
    <div>
      <h2 className="mt-0">Performance Reviews</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search status or summary…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
              <th className="py-2">Employee</th>
              <th>Cycle</th>
              <th>Score</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r: any) => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5">
                  <Link href={`/reviews/${r.id}`}>{r.employee.fullName}</Link>
                </td>
                <td>{r.cycle.name}</td>
                <td>{avgScore(r) || r.overallScore ? Number(r.overallScore || avgScore(r)).toFixed(1) : '—'}</td>
                <td>{r.status}</td>
                <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('id-ID') : '—'}</td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2.5 text-gray-500 dark:text-gray-400">
                  No performance reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
