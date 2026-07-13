'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@/components/ui';

interface Shift {
  id: string; name: string; code: string;
  startTime: string; endTime: string;
  toleranceMinutes?: number; graceMinutes?: number;
  status: string;
}

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const { data: shifts = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get<Shift[]>('/attendance/shifts'),
  });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', startTime: '', endTime: '', toleranceMinutes: 0, graceMinutes: 0 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editId) { await api.put(`/attendance/shifts/${editId}`, form); } else { await api.post('/attendance/shifts', form); }
      setShowForm(false); setEditId(null); setForm({ name: '', code: '', startTime: '', endTime: '', toleranceMinutes: 0, graceMinutes: 0 });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } catch (e: any) { setError(e.message); }
  }

  function handleEdit(s: Shift) {
    setEditId(s.id); setForm({ name: s.name, code: s.code, startTime: s.startTime, endTime: s.endTime, toleranceMinutes: Number(s.toleranceMinutes || 0), graceMinutes: Number(s.graceMinutes || 0) });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete shift?')) return;
    try { await api.delete(`/attendance/shifts/${id}`); queryClient.invalidateQueries({ queryKey: ['shifts'] }); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0">Shifts</h3>
        <Button variant="secondary" size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', code: '', startTime: '', endTime: '', toleranceMinutes: 0, graceMinutes: 0 }); }}>
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {(error || queryError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || (queryError as any)?.message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 max-w-sm">
          <Card className="mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
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
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tolerance (min)</label>
              <input type="number" value={form.toleranceMinutes} onChange={(e) => setForm({ ...form, toleranceMinutes: parseInt(e.target.value) || 0 })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Grace (min)</label>
              <input type="number" value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: parseInt(e.target.value) || 0 })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit" variant="primary" size="md" className="mt-3">{editId ? 'Update' : 'Create'}</Button>
          </Card>
        </form>
      )}

      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!loading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="py-2 font-medium">Name</th><th className="font-medium">Code</th><th className="font-medium">Time</th><th className="font-medium">Status</th><th className="font-medium"></th>
          </tr></thead>
          <tbody>
            {shifts.map((s: any) => (
              <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-2.5">{s.name}</td>
                <td>{s.code}</td>
                <td>{s.startTime} – {s.endTime}</td>
                <td>{s.status}</td>
                <td>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}>Edit</Button>
                  <Button variant="danger" size="sm" className="ml-1" onClick={() => handleDelete(s.id)}>Del</Button>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && <tr><td colSpan={5} className="py-2.5 text-gray-500 dark:text-gray-400">No shifts.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
