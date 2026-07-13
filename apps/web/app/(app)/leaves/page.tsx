'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useServerTable } from '@/hooks/use-server-table';
import { Button, Card, Pagination } from '@/components/ui';

interface Balance {
  id: string;
  leaveType: { id: string; name: string; code: string };
  totalEntitled: number;
  totalUsed: number;
  totalPending: number;
  carryForward: number;
}

interface LeaveRequest {
  id: string;
  leaveType: { id: string; name: string; code: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  employee: { id: string; employeeId: string; fullName: string };
}

export default function LeavesPage() {
  return <Suspense fallback={<p className="text-gray-400">Loading…</p>}><LeavesContent /></Suspense>;
}

function LeavesContent() {
  const searchParams = useSearchParams();
  const employeeFilter = searchParams.get('employee');
  const { data: balances = [], error: balError } = useQuery({
    queryKey: ['leave-balances', '2026'],
    queryFn: () => api.get<Balance[]>('/attendance/balances?year=2026'),
  });
  const { rows: requests, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['leaves', employeeFilter], ({ page, limit, q }) =>
      api.get('/attendance/leave-requests', { params: { page, limit, q, employee: employeeFilter ?? undefined } }),
    );
  const errorMessage = error instanceof Error ? error.message : (balError?.message || '');

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="mt-0">Leave</h2>
        <Link href="/leaves/new"><Button>+ New Request</Button></Link>
      </div>
      {errorMessage && <div className="text-red-500 text-sm mb-3">{errorMessage}</div>}

      <h4>Leave Balances</h4>
      <div className="flex gap-3 flex-wrap mb-6">
        {balances.length === 0 && <p className="text-gray-400 text-xs">No balances found.</p>}
        {balances.map((b: any) => (
          <Card key={b.id} className="min-w-40">
            <strong>{b.leaveType.name}</strong>
            <div className="text-2xl font-bold">{b.totalEntitled - b.totalUsed - b.totalPending + b.carryForward}</div>
            <div className="text-xs text-gray-400">
              {b.totalUsed} used · {b.totalPending} pending · {b.carryForward} carried
            </div>
          </Card>
        ))}
      </div>

      {employeeFilter && <p className="text-xs text-gray-400 mb-2">Showing leave for employee filter: {employeeFilter}</p>}

      <h4>Leave Requests</h4>
      <input
        type="text" placeholder="Search status…"
        value={search} onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-gray-400 text-xs">
            <th className="py-2">Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Status</th>
            <th>Employee</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r: any) => (
            <tr key={r.id} className="border-t border-gray-700">
              <td className="py-2.5">
                <Link href={`/leaves/${r.id}`}>{r.leaveType.name}</Link>
              </td>
              <td>{new Date(r.startDate).toLocaleDateString('id-ID')} – {new Date(r.endDate).toLocaleDateString('id-ID')}</td>
              <td>{r.totalDays}</td>
              <td>{r.status}</td>
              <td>{r.employee.fullName}</td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={5} className="py-2.5 text-gray-400">No leave requests found.</td>
            </tr>
          )}
        </tbody>
      </table>
      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
    </div>
  );
}
