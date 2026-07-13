'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { useCalibrations, useFinalizeCalibration } from '@/hooks/use-calibrations';

interface Session { id: string; sessionDate: string; status: string; overallRating?: number; cycle?: { name: string }; facilitator?: { fullName: string }; finalScores?: any[]; }

const STATUS_COLORS: Record<string, string> = { scheduled: 'text-blue-500', in_progress: 'text-yellow-500', completed: 'text-green-500' };

export default function CalibrationsPage() {
  const { data: sessions = [], isLoading } = useCalibrations();
  const finalize = useFinalizeCalibration();
  const [error, setError] = useState(''); const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cycleId: '', facilitatorId: '', sessionDate: '' });
  const { data: cycles = [] } = useQuery({ queryKey: ['cycles', 'lookup'], queryFn: () => api.get<any[]>('/cycles') });
  const { data: facilitators = [] } = useQuery({ queryKey: ['employees', 'lookup'], queryFn: () => api.get<any[]>('/employees') });

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError('');
    try { await api.post('/performance/calibrations', form); setShowForm(false); setForm({ cycleId: '', facilitatorId: '', sessionDate: '' }); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold m-0">Calibration Sessions</h2>
        <Button variant={showForm ? 'danger' : 'primary'} size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Session'}
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {showForm && (
        <Card className="max-w-md mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Review Cycle</label>
              <select value={form.cycleId} onChange={e => setForm({...form, cycleId: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select…</option>
                {cycles.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Facilitator</label>
              <select value={form.facilitatorId} onChange={e => setForm({...form, facilitatorId: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select…</option>
                {facilitators.map((f: any) => <option key={f.id} value={f.id}>{f.fullName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Session Date</label>
              <input type="date" value={form.sessionDate} onChange={e => setForm({...form, sessionDate: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit" size="sm">Create</Button>
          </form>
        </Card>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
      {!isLoading && <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="pb-2 pr-4">Cycle</th><th className="pb-2 pr-4">Facilitator</th><th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Scores</th><th className="pb-2 pr-4">Rating</th><th className="pb-2 pr-4">Status</th><th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                  <td className="py-2.5 pr-4">{s.cycle?.name || '—'}</td>
                  <td className="py-2.5 pr-4">{s.facilitator?.fullName || '—'}</td>
                  <td className="py-2.5 pr-4">{new Date(s.sessionDate).toLocaleDateString('id-ID')}</td>
                  <td className="py-2.5 pr-4">{s.finalScores?.length || 0}</td>
                  <td className="py-2.5 pr-4">{s.overallRating != null ? s.overallRating.toFixed(2) : '—'}</td>
                  <td className={`py-2.5 pr-4 font-semibold ${STATUS_COLORS[s.status] || ''}`}>{s.status.replace('_', ' ').toUpperCase()}</td>
                    <td className="py-2.5">
                    {s.status !== 'completed' && <Button size="sm" onClick={() => finalize.mutate(s.id)}>Finalize</Button>}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={7} className="py-4 text-sm text-gray-400">No calibration sessions.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>}
    </div>
  );
}
