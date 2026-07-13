'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { type Asset } from '@/hooks/use-assets';
import { Pagination } from '@/components/ui';

export default function AssetsPage() {
  const { rows: assets, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['assets'], ({ page, limit, q }) =>
      api.get('/assets', { params: { page, limit, q } }),
    );

  const currentAssignee = (a: Asset) =>
    a.assignments?.find((as: any) => !as.returnedAt)?.employee;

  return (
    <div>
      <h2 className="mt-0">Assets</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search code, name, category…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2">Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Assigned To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a: any) => {
              const assignee = currentAssignee(a);
              return (
                <tr key={a.id} className="border-t border-gray-700">
                  <td className="py-2.5">{a.code}</td>
                  <td><Link href={`/assets/${a.id}`}>{a.name}</Link></td>
                  <td>{a.category}</td>
                  <td>{a.brand || '—'}</td>
                  <td>{assignee ? assignee.fullName : '—'}</td>
                  <td>{a.status}</td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr><td colSpan={6} className="py-2.5 text-gray-400">No assets found.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
