'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Button, Pagination } from '@/components/ui';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
  currentCompany?: string;
  currentPosition?: string;
  status: string;
  createdAt: string;
  applications: { id: string }[];
}

export default function CandidatesPage() {
  const { rows: candidates, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['candidates'], ({ page, limit, q }) =>
      api.get('/recruitment/candidates', { params: { page, limit, q } }),
    );

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="mt-0">Candidates</h2>
        <Link href="/candidates/new"><Button>+ New Candidate</Button></Link>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search name, email, position…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Current Position</th>
              <th>Source</th>
              <th>Applications</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c: any) => (
              <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5">
                  <Link href={`/candidates/${c.id}`}>{c.firstName} {c.lastName}</Link>
                </td>
                <td>{c.email}</td>
                <td>{c.currentPosition ? `${c.currentPosition}${c.currentCompany ? ` @ ${c.currentCompany}` : ''}` : '—'}</td>
                <td>{c.source || '—'}</td>
                <td>{c.applications?.length || 0}</td>
                <td>{c.status}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={7} className="py-2.5 text-gray-500 dark:text-gray-400">
                  No candidates found.
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
