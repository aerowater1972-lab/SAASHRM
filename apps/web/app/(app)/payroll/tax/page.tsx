'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface TaxConfig {
  id: string; name: string; rate: number; minIncome?: number; maxIncome?: number; isActive: boolean;
}

export default function TaxConfigPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', rate: 0, minIncome: 0, maxIncome: 0, isActive: true });
  const [error, setError] = useState('');

  const { data: configs = [], isLoading, refetch } = useQuery({
    queryKey: ['tax-configs'],
    queryFn: () => api.get<TaxConfig[]>('/payroll/tax/configs'),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, minIncome: form.minIncome || undefined, maxIncome: form.maxIncome || undefined };
      if (editId) { await api.put(`/payroll/tax/configs/${editId}`, payload); } else { await api.post('/payroll/tax/configs', payload); }
      setShowForm(false); setEditId(null); setForm({ name: '', rate: 0, minIncome: 0, maxIncome: 0, isActive: true });
      await refetch();
    } catch (e: any) { setError(e.message); }
  }

  function handleEdit(c: TaxConfig) {
    setEditId(c.id); setForm({ name: c.name, rate: Number(c.rate), minIncome: Number(c.minIncome || 0), maxIncome: Number(c.maxIncome || 0), isActive: c.isActive });
    setShowForm(true);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0">Tax Configurations</h3>
        <Button variant="secondary" size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', rate: 0, minIncome: 0, maxIncome: 0, isActive: true }); }}>
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 max-w-sm">
          <Card className="mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Rate (%)</label>
              <input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Min Income</label>
              <input type="number" value={form.minIncome} onChange={(e) => setForm({ ...form, minIncome: parseInt(e.target.value) || 0 })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Max Income</label>
              <input type="number" value={form.maxIncome} onChange={(e) => setForm({ ...form, maxIncome: parseInt(e.target.value) || 0 })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="active" className="rounded border-gray-300" />
              <label htmlFor="active" className="m-0 text-xs font-medium text-gray-600 dark:text-gray-400">Active</label>
            </div>
            <Button type="submit" variant="primary" size="md" className="mt-3">{editId ? 'Update' : 'Create'}</Button>
          </Card>
        </form>
      )}

      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="py-2 font-medium">Name</th><th className="font-medium">Rate</th><th className="font-medium">Min</th><th className="font-medium">Max</th><th className="font-medium">Active</th><th className="font-medium"></th>
          </tr></thead>
          <tbody>
            {configs.map((c: any) => (
              <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-2.5">{c.name}</td>
                <td>{Number(c.rate)}%</td>
                <td>{c.minIncome ? `Rp ${Number(c.minIncome).toLocaleString('id-ID')}` : '—'}</td>
                <td>{c.maxIncome ? `Rp ${Number(c.maxIncome).toLocaleString('id-ID')}` : '—'}</td>
                <td>{c.isActive ? 'Yes' : 'No'}</td>
                <td><Button variant="secondary" size="sm" onClick={() => handleEdit(c)}>Edit</Button></td>
              </tr>
            ))}
            {configs.length === 0 && <tr><td colSpan={6} className="py-2.5 text-gray-500 dark:text-gray-400">No tax configs.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
