'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Pagination } from '@/components/ui';

export default function BenefitsPage() {
  const { rows: benefits, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['benefits'], ({ page, limit, q }) =>
      api.get('/benefits', { params: { page, limit, q } }),
    );

  return (
    <div>
      <h2 className="mt-0">Benefits</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search code, name, type…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2">Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {benefits.map((b: any) => (
              <tr key={b.id} className="border-t border-gray-700">
                <td className="py-2.5">{b.code}</td>
                <td><Link href={`/benefits/${b.id}`}>{b.name}</Link></td>
                <td>{b.type}</td>
                <td>{b.amount ? `Rp ${Number(b.amount).toLocaleString('id-ID')}` : '—'}</td>
                <td>{b.isActive ? '✓' : '✕'}</td>
              </tr>
            ))}
            {benefits.length === 0 && (
              <tr><td colSpan={5} className="py-2.5 text-gray-400">No benefits found.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
