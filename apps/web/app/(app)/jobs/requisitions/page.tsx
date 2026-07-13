'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { useRequisitions, useCreateRequisition, useUpdateRequisitionStatus } from '@/hooks/use-requisitions';

interface Requisition { id: string; title: string; department?: { name: string }; headcount: number; status: string; priority: string; createdAt: string; }

const STATUS_STYLES: Record<string, string> = { draft: 'text-gray-500', open: 'text-blue-500', closed: 'text-green-500', cancelled: 'text-red-500' };
const PRIORITY_STYLES: Record<string, string> = { normal: 'text-gray-400', urgent: 'text-red-500' };

export default function JobRequisitionsPage() {
  const { data: requisitions = [], isLoading } = useRequisitions();
  const create = useCreateRequisition();
  const updateStatus = useUpdateRequisitionStatus();
  const [error, setError] = useState(''); const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', departmentId: '', positionId: '', headcount: 1, priority: 'normal' });
  const { data: departments = [] } = useQuery({ queryKey: ['departments', 'lookup'], queryFn: () => api.get<any[]>('/employees/organization/departments') });
  const { data: positions = [] } = useQuery({ queryKey: ['positions', 'lookup'], queryFn: () => api.get<any[]>('/employees/organization/positions') });

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError('');
    try { create.mutate(form); setShowForm(false); setForm({ title: '', departmentId: '', positionId: '', headcount: 1, priority: 'normal' }); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold m-0">Job Requisitions</h2>
        <Button variant={showForm ? 'danger' : 'primary'} size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Requisition'}
        </Button>
      </div>
      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
      {showForm && (
        <Card className="max-w-md mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Title</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Department</label>
              <select value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select…</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Headcount</label>
              <input type="number" min={1} value={form.headcount} onChange={e => setForm({...form, headcount: +e.target.value})}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="normal">Normal</option><option value="urgent">Urgent</option>
              </select>
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
                <th className="pb-2 pr-4">Title</th><th className="pb-2 pr-4">Dept</th><th className="pb-2 pr-4">Headcount</th><th className="pb-2 pr-4">Priority</th><th className="pb-2 pr-4">Status</th><th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map(r => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                  <td className="py-2.5 pr-4">{r.title}</td>
                  <td className="py-2.5 pr-4">{r.department?.name || '—'}</td>
                  <td className="py-2.5 pr-4">{r.headcount}</td>
                  <td className={`py-2.5 pr-4 font-semibold ${PRIORITY_STYLES[r.priority] || ''}`}>{r.priority}</td>
                  <td className={`py-2.5 pr-4 font-semibold ${STATUS_STYLES[r.status] || ''}`}>{r.status.toUpperCase()}</td>
                  <td className="py-2.5">
                    {r.status === 'draft' && <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'open' })}>Open</Button>}
                    {r.status === 'open' && <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'closed' })}>Close</Button>}
                  </td>
                </tr>
              ))}
              {requisitions.length === 0 && <tr><td colSpan={6} className="py-4 text-sm text-gray-400">No requisitions.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>}
    </div>
  );
}
