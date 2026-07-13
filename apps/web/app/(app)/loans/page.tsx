'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Button, Pagination } from '@/components/ui';

interface Loan {
  id: string;
  amount: number;
  installmentCount: number;
  installmentAmount: number;
  remainingBalance: number;
  purpose?: string;
  status: string;
  createdAt: string;
  employee: { id: string; employeeId: string; fullName: string };
  _count?: { installments: number };
}

export default function LoansPage() {
  const { rows: loans, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['loans'], ({ page, limit, q }) =>
      api.get('/expense/loans', { params: { page, limit, q } }),
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="mt-0">Loan Applications</h2>
        <Link href="/loans/new"><Button>+ New Loan</Button></Link>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          <input
            type="text" placeholder="Search purpose or status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2">Purpose</th>
              <th>Employee</th>
              <th>Amount</th>
              <th>Installments</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l: any) => (
              <tr key={l.id} className="border-t border-gray-700">
                <td className="py-2.5">
                  <Link href={`/loans/${l.id}`}>{l.purpose || 'Loan'}</Link>
                </td>
                <td>{l.employee.fullName}</td>
                <td>{Number(l.amount).toLocaleString('id-ID')}</td>
                <td>{l.installmentCount} × {Number(l.installmentAmount).toLocaleString('id-ID')}</td>
                <td>{Number(l.remainingBalance).toLocaleString('id-ID')}</td>
                <td>{l.status}</td>
                <td>{new Date(l.createdAt).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {loans.length === 0 && (
              <tr>
                <td colSpan={7} className="py-2.5 text-gray-400">
                  No loan applications found.
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
