'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIntegrations } from '@/hooks/use-admin';
import { useQueryClient } from '@tanstack/react-query';

interface Integration { id: string; name: string; type: string; status: string; lastSyncAt?: string; errorMessage?: string; }

export default function IntegrationsPage() {
  const pathname = usePathname();
  const { data: integrations = [], isLoading, error } = useIntegrations();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'BANK', credentials: '{}', config: '{}' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try { await api.post('/admin/integrations', form); setShowForm(false); setForm({ name: '', type: 'BANK', credentials: '{}', config: '{}' }); qc.invalidateQueries({ queryKey: ['integrations'] }); }
    catch (e: any) { alert(e.message); }
  }

  async function handleTest(id: string) {
    try { const res = await api.post<{ success: boolean; message: string }>(`/admin/integrations/${id}/test`, {}); alert(res.message); }
    catch (e: any) { alert(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this integration?')) return;
    try { await api.delete(`/admin/integrations/${id}`); qc.invalidateQueries({ queryKey: ['integrations'] }); }
    catch (e: any) { alert(e.message); }
  }

  const linkClass = (active: boolean) =>
    `no-underline text-sm ${active ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 font-normal'}`;

  return (
    <div>
      <h2 className="mt-0 text-lg font-bold">Admin</h2>
      <div className="flex gap-3 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex-wrap">
        <Link href="/admin/roles" className={linkClass(pathname.startsWith('/admin/roles'))}>Roles</Link>
        <Link href="/admin/tenants" className={linkClass(pathname.startsWith('/admin/tenants'))}>Tenants</Link>
        <Link href="/admin/feature-flags" className={linkClass(pathname.startsWith('/admin/feature-flags'))}>Feature Flags</Link>
        <Link href="/admin/integrations" className={linkClass(pathname.startsWith('/admin/integrations'))}>Integrations</Link>
        <Link href="/admin/audit-logs" className={linkClass(pathname.startsWith('/admin/audit-logs'))}>Audit Logs</Link>
        <Link href="/admin/workflows" className={linkClass(pathname.startsWith('/admin/workflows'))}>Workflows</Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-base font-semibold">Integration Hub</h3>
        <Button variant="secondary" size="sm" onClick={() => { setShowForm(!showForm); setForm({ name: '', type: 'BANK', credentials: '{}', config: '{}' }); }}>
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error instanceof Error ? error.message : 'Failed to load'}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="max-w-[500px] mb-4">
          <Card className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. BCA Payroll" />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="BANK">Bank</option>
                <option value="BPJS">BPJS</option>
                <option value="BIOMETRIC">Biometric</option>
                <option value="PAYMENT_GATEWAY">Payment Gateway</option>
                <option value="EMAIL">Email</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Credentials (JSON)</label>
              <textarea value={form.credentials} onChange={(e) => setForm({ ...form, credentials: e.target.value })} rows={3} placeholder='{"apiKey":"...","apiSecret":"..."}'
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Config (JSON)</label>
              <textarea value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} rows={2} placeholder='{}'
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit" size="sm">Create</Button>
          </Card>
        </form>
      )}

      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
            <th className="py-2 pr-4">Name</th><th className="pr-4">Type</th><th className="pr-4">Status</th><th className="pr-4">Last Sync</th><th></th>
          </tr></thead>
          <tbody>
            {integrations.map((i: any) => (
              <tr key={i.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-3 pr-4">{i.name}</td>
                <td className="pr-4"><span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{i.type}</span></td>
                <td className="pr-4"><span className={i.status === 'ACTIVE' ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}>{i.status}</span></td>
                <td className="pr-4 text-xs text-gray-500 dark:text-gray-400">{i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleString() : '—'}</td>
                <td className="space-x-1">
                  <Button variant="secondary" size="sm" onClick={() => handleTest(i.id)}>Test</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(i.id)}>Del</Button>
                </td>
              </tr>
            ))}
            {integrations.length === 0 && <tr><td colSpan={5} className="text-gray-500 dark:text-gray-400 py-3 text-center">No integrations configured.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
