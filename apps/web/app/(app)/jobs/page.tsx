'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Button, Pagination } from '@/components/ui';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  employmentType?: string;
  location?: string;
  minSalary?: number;
  maxSalary?: number;
  slots: number;
  filledSlots: number;
  status: string;
  createdAt: string;
  applications: { id: string; status: string }[];
}

export default function JobsPage() {
  const { rows: jobs, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['jobs'], ({ page, limit, q }) =>
      api.get('/recruitment/jobs', { params: { page, limit, q } }),
    );

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="mt-0">Job Postings</h2>
        <Link href="/jobs/new"><Button>+ New Job</Button></Link>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search title, type, location…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
              <th className="py-2">Title</th>
              <th>Type</th>
              <th>Location</th>
              <th>Slots</th>
              <th>Applicants</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j: any) => (
              <tr key={j.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5">
                  <Link href={`/jobs/${j.id}`}>{j.title}</Link>
                </td>
                <td>{j.employmentType?.replace('_', ' ') || '—'}</td>
                <td>{j.location || '—'}</td>
                <td>{j.filledSlots}/{j.slots}</td>
                <td>{j.applications.length}</td>
                <td>{j.status}</td>
                <td>{new Date(j.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-2.5 text-gray-500 dark:text-gray-400">
                  No job postings found.
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
