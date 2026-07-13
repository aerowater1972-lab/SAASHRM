'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTenants } from '@/hooks/use-admin';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Tenant { id: string; name: string; code: string; isActive: boolean; createdAt: string; }

export default function TenantsPage() {
  const pathname = usePathname();
  const { data: tenants = [], isLoading } = useTenants();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editId) { await api.put(`/admin/tenants/${editId}`, form); } else { await api.post('/admin/tenants', form); }
      setShowForm(false); setEditId(null); setForm({ name: '', code: '' }); queryClient.invalidateQueries({ queryKey: queryKeys.admin.tenants });
    } catch (e: any) { setError(e.message); }
  }

  const linkClass = (active: boolean) =>
    `no-underline text-sm ${active ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 font-normal'}`;

  return (
    <div>
      <h2 className="mt-0 text-lg font-bold">Admin</h2>
      <div className="flex gap-3 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex-wrap">
        <Link href="/admin/roles" className={linkClass(pathname.startsWith('/admin/roles'))}>Roles</Link>
        <Link href="/admin/tenants" className={linkClass(pathname === '/admin/tenants')}>Tenants</Link>
        <Link href="/admin/feature-flags" className={linkClass(pathname.startsWith('/admin/feature-flags'))}>Feature Flags</Link>
        <Link href="/admin/integrations" className={linkClass(pathname.startsWith('/admin/integrations'))}>Integrations</Link>
        <Link href="/admin/audit-logs" className={linkClass(pathname.startsWith('/admin/audit-logs'))}>Audit Logs</Link>
        <Link href="/admin/workflows" className={linkClass(pathname.startsWith('/admin/workflows'))}>Workflows</Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-base font-semibold">Tenants</h3>
        <Button variant="secondary" size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', code: '' }); }}>
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="max-w-[500px] mb-4">
          <Card className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Button type="submit" size="sm">{editId ? 'Update' : 'Create'}</Button>
          </Card>
        </form>
      )}

      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
            <th className="py-2 pr-4">Name</th><th className="pr-4">Code</th><th className="pr-4">Active</th><th className="pr-4">Created</th><th></th>
          </tr></thead>
          <tbody>
            {tenants.map((t: any) => (
              <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-3 pr-4">{t.name}</td>
                <td className="pr-4">{t.code}</td>
                <td className="pr-4">{t.isActive ? 'Yes' : 'No'}</td>
                <td className="pr-4">{new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
                <td><Button variant="secondary" size="sm" onClick={() => { setEditId(t.id); setForm({ name: t.name, code: t.code }); setShowForm(true); }}>Edit</Button></td>
              </tr>
            ))}
            {tenants.length === 0 && <tr><td colSpan={5} className="text-gray-500 dark:text-gray-400 py-3 text-center">No tenants.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
