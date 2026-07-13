'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Pagination } from '@/components/ui';

export default function ApplicationsPage() {
  const { rows: apps, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['applications'], ({ page, limit, q }) =>
      api.get('/recruitment/applications', { params: { page, limit, q } }),
    );

  return (
    <div>
      <h2 className="mt-0">Applications</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
              <th className="py-2">Candidate</th><th>Job</th><th>Status</th><th>Expected Salary</th><th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a: any) => (
              <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5">
                  <Link href={`/applications/${a.id}`}>{a.candidate.firstName} {a.candidate.lastName}</Link>
                </td>
                <td>{a.jobPosting.title}</td>
                <td>{a.status}</td>
                <td>{a.expectedSalary ? `Rp ${Number(a.expectedSalary).toLocaleString('id-ID')}` : '—'}</td>
                <td>{new Date(a.appliedAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {apps.length === 0 && <tr><td colSpan={5} className="py-2.5 text-gray-500 dark:text-gray-400">No applications.</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
