'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@/components/ui';

interface OvertimeRequest {
  id: string; employeeId: string; date: string;
  startTime: string; endTime: string; totalHours: number;
  reason?: string; status: string;
  employee?: { fullName: string };
}

export default function OvertimePage() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['overtime-requests'],
    queryFn: () => api.get<OvertimeRequest[]>('/attendance/overtime/requests'),
  });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '', reason: '' });

  const filtered = useMemo(() => {
    if (!search) return requests;
    const q = search.toLowerCase();
    return requests.filter((r: any) =>
      r.employee?.fullName?.toLowerCase().includes(q) || r.reason?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api.post('/attendance/overtime/requests', form);
      setShowForm(false); setForm({ date: '', startTime: '', endTime: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['overtime-requests'] });
    } catch (e: any) { setError(e.message); }
  }

  async function handleAction(id: string, status: string) {
    try {
      await api.put(`/attendance/overtime/requests/${id}`, { status, reviewedById: '' });
      queryClient.invalidateQueries({ queryKey: ['overtime-requests'] });
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0">Overtime</h3>
        <div className="flex gap-2">
          <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-40 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
          <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Request'}</Button>
        </div>
      </div>

      {(error || queryError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || (queryError as any)?.message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 max-w-sm">
          <Card className="mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit" variant="primary" size="md" className="mt-3">Submit</Button>
          </Card>
        </form>
      )}

      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="py-2 font-medium">Date</th><th className="font-medium">Hours</th><th className="font-medium">Reason</th><th className="font-medium">Status</th><th className="font-medium"></th>
          </tr></thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-2.5">{new Date(r.date).toLocaleDateString('id-ID')}</td>
                <td>{r.startTime}–{r.endTime} ({Number(r.totalHours).toFixed(1)}h)</td>
                <td className="text-xs text-gray-500 dark:text-gray-400">{r.reason || '—'}</td>
                <td>{r.status}</td>
                <td>{r.status === 'PENDING' && (
                  <><Button variant="secondary" size="sm" onClick={() => handleAction(r.id, 'APPROVED')}>Approve</Button>
                  <Button variant="danger" size="sm" className="ml-1" onClick={() => handleAction(r.id, 'REJECTED')}>Reject</Button></>
                )}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-2.5 text-gray-500 dark:text-gray-400">{search ? 'No matches.' : 'No overtime requests.'}</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
