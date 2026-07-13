'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { useMovements, useApproveMovement, useRejectMovement } from '@/hooks/use-movements';

interface Movement { id: string; type: string; status: string; effectiveDate: string; employee: { id: string; fullName: string; employeeId: string }; newPosition?: { id: string; name: string }; newDepartment?: { id: string; name: string }; createdAt: string; }

const TYPE_LABELS: Record<string, string> = { promotion: 'Promotion', transfer: 'Transfer', mutation: 'Mutation' };
const STATUS_STYLES: Record<string, string> = { pending: 'text-yellow-500', approved: 'text-green-500', rejected: 'text-red-500' };

export default function MovementsPage() {
  const { data: movements = [], isLoading } = useMovements();
  const approve = useApproveMovement();
  const reject = useRejectMovement();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', type: 'promotion', newPositionId: '', newDepartmentId: '', effectiveDate: '' });
  const { data: employees = [] } = useQuery({ queryKey: ['employees', 'lookup'], queryFn: () => api.get<any[]>('/employees') });
  const { data: positions = [] } = useQuery({ queryKey: ['positions', 'lookup'], queryFn: () => api.get<any[]>('/employees/organization/positions') });
  const { data: departments = [] } = useQuery({ queryKey: ['departments', 'lookup'], queryFn: () => api.get<any[]>('/employees/organization/departments') });

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError('');
    try { await api.post('/employees/movements', form); setShowForm(false); setForm({ employeeId: '', type: 'promotion', newPositionId: '', newDepartmentId: '', effectiveDate: '' }); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold m-0">Employee Movements</h2>
        <Button variant={showForm ? 'danger' : 'primary'} size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Movement'}
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {showForm && (
        <Card className="max-w-md mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Employee</label>
              <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select…</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeId})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="promotion">Promotion</option><option value="transfer">Transfer</option><option value="mutation">Mutation</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">New Position</label>
              <select value={form.newPositionId} onChange={e => setForm({ ...form, newPositionId: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Same position</option>
                {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">New Department</label>
              <select value={form.newDepartmentId} onChange={e => setForm({ ...form, newDepartmentId: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Same department</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Effective Date</label>
              <input type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit" size="sm">Submit</Button>
          </form>
        </Card>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      {!isLoading && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-4">Employee</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">New Position</th><th className="pb-2 pr-4">New Dept</th><th className="pb-2 pr-4">Effective</th><th className="pb-2 pr-4">Status</th><th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m: any) => (
                  <tr key={m.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                    <td className="py-2.5 pr-4">{m.employee?.fullName || '—'}</td>
                    <td className="py-2.5 pr-4">{TYPE_LABELS[m.type] || m.type}</td>
                    <td className="py-2.5 pr-4">{m.newPosition?.name || '—'}</td>
                    <td className="py-2.5 pr-4">{m.newDepartment?.name || '—'}</td>
                    <td className="py-2.5 pr-4">{new Date(m.effectiveDate).toLocaleDateString('id-ID')}</td>
                    <td className={`py-2.5 pr-4 font-semibold ${STATUS_STYLES[m.status] || ''}`}>{m.status.toUpperCase()}</td>
                    <td className="py-2.5">
                      {m.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="primary" onClick={() => approve.mutate(m.id)}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => reject.mutate(m.id)}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && <tr><td colSpan={7} className="py-4 text-sm text-gray-400">No movement requests.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
