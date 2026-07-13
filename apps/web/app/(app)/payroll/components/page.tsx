'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Component {
  id: string; name: string; type: string; calculationMethod: string;
  value: number; isActive: boolean; description?: string;
}

export default function PayrollComponentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'EARNING', calculationMethod: 'FIXED', value: 0, isActive: true, description: '' });
  const [error, setError] = useState('');

  const { data: comps = [], isLoading, refetch } = useQuery({
    queryKey: ['payroll-components'],
    queryFn: () => api.get<Component[]>('/payroll/components'),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editId) { await api.put(`/payroll/components/${editId}`, form); } else { await api.post('/payroll/components', form); }
      setShowForm(false); setEditId(null); setForm({ name: '', type: 'EARNING', calculationMethod: 'FIXED', value: 0, isActive: true, description: '' });
      await refetch();
    } catch (e: any) { setError(e.message); }
  }

  function handleEdit(c: Component) {
    setEditId(c.id); setForm({ name: c.name, type: c.type, calculationMethod: c.calculationMethod, value: Number(c.value), isActive: c.isActive, description: c.description || '' });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete component?')) return;
    try { await api.delete(`/payroll/components/${id}`); await refetch(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0">Payroll Components</h3>
        <Button variant="secondary" size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', type: 'EARNING', calculationMethod: 'FIXED', value: 0, isActive: true, description: '' }); }}>
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
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option>EARNING</option><option>DEDUCTION</option>
              </select>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Method</label>
              <select value={form.calculationMethod} onChange={(e) => setForm({ ...form, calculationMethod: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option>FIXED</option><option>PERCENTAGE</option>
              </select>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Value</label>
              <input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="active" className="rounded border-gray-300" />
              <label htmlFor="active" className="m-0 text-xs font-medium text-gray-600 dark:text-gray-400">Active</label>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit" variant="primary" size="md" className="mt-3">{editId ? 'Update' : 'Create'}</Button>
          </Card>
        </form>
      )}

      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="py-2 font-medium">Name</th><th className="font-medium">Type</th><th className="font-medium">Method</th><th className="font-medium">Value</th><th className="font-medium">Active</th><th className="font-medium"></th>
          </tr></thead>
          <tbody>
            {comps.map((c: any) => (
              <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-2.5">{c.name}</td>
                <td>{c.type}</td>
                <td>{c.calculationMethod}</td>
                <td>{c.calculationMethod === 'PERCENTAGE' ? `${Number(c.value)}%` : `Rp ${Number(c.value).toLocaleString('id-ID')}`}</td>
                <td>{c.isActive ? 'Yes' : 'No'}</td>
                <td>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(c)}>Edit</Button>
                  <Button variant="danger" size="sm" className="ml-1" onClick={() => handleDelete(c.id)}>Del</Button>
                </td>
              </tr>
            ))}
            {comps.length === 0 && <tr><td colSpan={6} className="py-2.5 text-gray-500 dark:text-gray-400">No components.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
