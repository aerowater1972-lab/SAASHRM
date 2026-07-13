'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { Button, Pagination } from '@/components/ui';

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

interface ExpenseClaim {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  employee: { id: string; employeeId: string; fullName: string };
  items: ExpenseItem[];
}

export default function ExpensesPage() {
  return <Suspense fallback={<p className="text-gray-400">Loading…</p>}><ExpensesContent /></Suspense>;
}

function ExpensesContent() {
  const searchParams = useSearchParams();
  const employeeFilter = searchParams.get('employee');
  const { rows: claims, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['expenses', employeeFilter], ({ page, limit, q }) =>
      api.get('/expense/claims', { params: { page, limit, q, employee: employeeFilter ?? undefined } }),
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="mt-0">Expense Claims</h2>
        <Link href="/expenses/new"><Button>+ New Claim</Button></Link>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">{error.message}</div>}
      {loading && <p className="text-gray-400">Loading…</p>}
      {!loading && !error && (
        <>
          {employeeFilter && <p className="text-xs text-gray-400 mb-2">Showing expenses for employee filter: {employeeFilter}</p>}
          <input
            type="text" placeholder="Search title or status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-gray-400 text-xs">
                <th className="py-2">Title</th>
                <th>Employee</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c: any) => (
                <tr key={c.id} className="border-t border-gray-700">
                  <td className="py-2.5">
                    <Link href={`/expenses/${c.id}`}>{c.title}</Link>
                  </td>
                  <td>{c.employee.fullName}</td>
                  <td>{Number(c.totalAmount).toLocaleString('id-ID')}</td>
                  <td>{c.status}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2.5 text-gray-400">
                    {employeeFilter ? 'No expenses for this employee.' : 'No expense claims found.'}
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
