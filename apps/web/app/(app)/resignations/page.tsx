'use client';

import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Button, Pagination } from '@/components/ui';

interface Resignation {
  id: string;
  type: string;
  reason: string;
  status: string;
  resignationDate: string;
  effectiveDate: string;
  createdAt: string;
  employee: { id: string; employeeId: string; fullName: string; email: string };
}

export default function ResignationsPage() {
  const { rows: requests, total, page, setPage, search, setSearch, isLoading, error } =
    useServerTable<any>(['resignations'], ({ page, limit, q }) =>
      api.get('/resignation/requests', { params: { page, limit, q } }),
    );

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="mt-0">Resignations & Offboarding</h2>
        <Link href="/resignations/new"><Button>+ New Request</Button></Link>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">{error?.message}</div>}
      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && !error && (
        <>
          <input
            type="text" placeholder="Search type, reason, status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
              <th className="py-2">Employee</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Effective</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r: any) => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5">
                  <Link href={`/resignations/${r.id}`}>{r.employee.fullName}</Link>
                </td>
                <td>{r.type}</td>
                <td className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{r.reason}</td>
                <td>{r.status}</td>
                <td>{new Date(r.effectiveDate).toLocaleDateString('id-ID')}</td>
                <td>{new Date(r.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2.5 text-gray-500 dark:text-gray-400">
                  No resignation requests found.
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
