'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useServerTable } from '@/hooks/use-server-table';
import { Button, Pagination } from '@/components/ui';

interface Training { id: string; title: string; description?: string; type: string; startDate: string; endDate: string; status: string; maxParticipants?: number; }

export default function TrainingsPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'ONLINE', startDate: '', endDate: '', maxParticipants: 0 });
  const [error, setError] = useState('');

  const { rows: trainings, total, page, setPage, search, setSearch, isLoading } =
    useServerTable<any>(['trainings'], ({ page, limit, q }) =>
      api.get('/learning/trainings', { params: { page, limit, q } }),
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editId) { await api.put(`/learning/trainings/${editId}`, form); } else { await api.post('/learning/trainings', form); }
      setShowForm(false); setEditId(null); setForm({ title: '', description: '', type: 'ONLINE', startDate: '', endDate: '', maxParticipants: 0 });
      await queryClient.invalidateQueries({ queryKey: ['trainings'] });
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="flex gap-3 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/learning/trainings" className={`no-underline text-sm ${pathname === '/learning/trainings' ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 font-normal'}`}>Trainings</Link>
        <Link href="/learning/certifications" className={`no-underline text-sm ${pathname.startsWith('/learning/certifications') ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 font-normal'}`}>Certifications</Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0">Trainings</h3>
        <Button variant="secondary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: '', description: '', type: 'ONLINE', startDate: '', endDate: '', maxParticipants: 0 }); }}>
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 max-w-[500px] mb-4">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option>ONLINE</option><option>OFFLINE</option><option>SELF_PACED</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Max Participants</label>
              <input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 0 })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit">{editId ? 'Update' : 'Create'}</Button>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <>
          <input
            type="text" placeholder="Search title, type, status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead><tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
            <th className="py-2">Title</th><th>Type</th><th>Period</th><th>Status</th>
          </tr></thead>
          <tbody>
            {trainings.map((t: any) => (
              <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5"><Link href={`/learning/trainings/${t.id}`}>{t.title}</Link></td>
                <td>{t.type}</td>
                <td>{new Date(t.startDate).toLocaleDateString('id-ID')} – {new Date(t.endDate).toLocaleDateString('id-ID')}</td>
                <td>{t.status}</td>
              </tr>
            ))}
            {trainings.length === 0 && <tr><td colSpan={4} className="text-gray-500 dark:text-gray-400 py-2.5">No trainings.</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
