'use client';

import { useState } from 'react';
import Link from 'next/link';
import { exportToCSV } from '@/lib/export';
import { Button, Pagination } from '@/components/ui';
import { useEmployees } from '@/hooks/use-employees';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e',
  PENDING_ACTIVATION: '#eab308',
  INACTIVE: '#94a3b8',
};

export default function EmployeesPage() {
  const { data: employees } = useEmployees();
  const [statusFilter, setStatusFilter] = useState('');
  const { rows: employeeRows, total, page, setPage, search, setSearch, isLoading, error } =
    useServerTable<any>(['employees', statusFilter], ({ page, limit, q }) =>
      api.get('/employees', { params: { page, limit, q, status: statusFilter || undefined } }),
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0">Employees</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/employees/new" className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-900 no-underline transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">+ New</Link>
          <Link href="/employees/import" className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-900 no-underline transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">Import CSV</Link>
          <Button variant="secondary" size="sm" onClick={() => exportToCSV(
            ['ID', 'Name', 'Email', 'Department', 'Status'],
            (employees ?? []).map((e: any) => [e.employeeId, e.fullName, e.email, e.employments?.[0]?.department?.name ?? '', e.status]),
            'employees'
          )}>Export CSV</Button>
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <input
          type="text" placeholder="Search name, ID, email…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_ACTIVATION">Pending</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <span className="self-center text-xs text-gray-500 dark:text-gray-400">{total} employee(s)</span>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error instanceof Error ? error.message : 'Failed to load'}</div>}
      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && !error && (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="py-2 font-medium">ID</th>
                <th className="font-medium">Name</th>
                <th className="font-medium">Email</th>
                <th className="font-medium">Department</th>
                <th className="font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {employeeRows.map((e: any) => (
                <tr key={e.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2.5">{e.employeeId}</td>
                  <td>
                    <Link href={`/employees/${e.id}`}>{e.fullName}</Link>
                  </td>
                  <td>{e.email}</td>
                  <td>{e.employments?.[0]?.department?.name ?? '—'}</td>
                  <td>
                    <span style={{
                      color: STATUS_COLORS[e.status] || 'var(--muted)',
                      fontWeight: 600, fontSize: 12,
                    }}>{e.status === 'PENDING_ACTIVATION' ? 'PENDING' : e.status}</span>
                  </td>
                </tr>
              ))}
              {employeeRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2.5 text-gray-500 dark:text-gray-400">
                    {search || statusFilter ? 'No employees match your filters.' : 'No employees found.'}
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
