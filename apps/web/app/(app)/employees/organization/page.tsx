'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Department { id: string; name: string; code?: string; description?: string; parentId?: string; }
interface Position { id: string; name: string; code?: string; description?: string; grade?: string; }
interface Grade { id: string; name: string; code?: string; level?: number; }

interface OrgNode { id: string; name: string; code?: string; children?: OrgNode[]; }

export default function OrganizationPage() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'departments' | 'positions' | 'grades' | 'orgchart'>('departments');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading: depsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<Department[]>('/departments'),
  });
  const { data: positions = [], isLoading: possLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: () => api.get<Position[]>('/positions'),
  });
  const { data: grades = [], isLoading: grdsLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => api.get<Grade[]>('/grades'),
  });
  const { data: orgChart = [], isLoading: chartLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<OrgNode[]>('/organizations'),
  });

  const loading = depsLoading || possLoading || grdsLoading || chartLoading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const path = activeTab === 'departments' ? '/departments' : activeTab === 'positions' ? '/positions' : '/grades';
      if (editId) { await api.put(`${path}/${editId}`, form); } else { await api.post(path, form); }
      setShowForm(false); setEditId(null); setForm({ name: '', code: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    } catch (e: any) { setError(e.message); }
  }

  function renderOrgTree(nodes: OrgNode[], depth = 0) {
    return nodes.map((n: any) => (
      <div key={n.id} style={{ marginLeft: depth * 24 }} className="py-1.5">
        <span className={depth === 0 ? 'font-semibold' : 'font-normal'}>{n.name}</span>
        {n.code && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({n.code})</span>}
        {n.children && renderOrgTree(n.children, depth + 1)}
      </div>
    ));
  }

  const activeData = activeTab === 'departments' ? departments : activeTab === 'positions' ? positions : grades;

  return (
    <div>
      <div className="mb-4 flex gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
        {(['departments', 'positions', 'grades', 'orgchart'] as const).map((tab: any) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`cursor-pointer border-none bg-transparent p-0 text-sm ${activeTab === tab ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {activeTab === 'orgchart' ? (
        <Card>
          {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
            orgChart.length > 0 ? renderOrgTree(orgChart) : <p className="text-gray-500 dark:text-gray-400">No org data.</p>
          )}
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
            <Button variant="secondary" size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', code: '', description: '' }); }}>
              {showForm ? 'Cancel' : '+ New'}
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-4 max-w-sm">
              <Card className="mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Code</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                </div>
                <Button type="submit" variant="primary" size="md" className="mt-3">{editId ? 'Update' : 'Create'}</Button>
              </Card>
            </form>
          )}

          {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
          {!loading && (
            <table className="w-full border-collapse">
              <thead><tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="py-2 font-medium">Name</th><th className="font-medium">Code</th><th className="font-medium"></th>
              </tr></thead>
              <tbody>
                {(activeData as any[]).map((item: any) => (
                  <tr key={item.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2.5">{item.name}</td>
                    <td>{item.code || '—'}</td>
                    <td><Button variant="secondary" size="sm" onClick={() => { setEditId(item.id); setForm({ name: item.name, code: item.code || '', description: item.description || '' }); setShowForm(true); }}>Edit</Button></td>
                  </tr>
                ))}
                {activeData.length === 0 && <tr><td colSpan={3} className="py-2.5 text-gray-500 dark:text-gray-400">None.</td></tr>}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
