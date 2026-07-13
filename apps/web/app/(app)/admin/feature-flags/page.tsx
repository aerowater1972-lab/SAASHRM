'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFeatureFlags } from '@/hooks/use-admin';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface FeatureFlag { id: string; module: string; feature: string; enabled: boolean; }

export default function FeatureFlagsPage() {
  const pathname = usePathname();
  const { data: flags = [], isLoading } = useFeatureFlags();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ module: '', feature: '', enabled: false });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try { await api.post('/admin/feature-flags', form); setShowForm(false); setForm({ module: '', feature: '', enabled: false }); queryClient.invalidateQueries({ queryKey: queryKeys.admin.featureFlags }); }
    catch (e: any) { setError(e.message); }
  }

  async function handleToggle(id: string) {
    try { await api.post(`/admin/feature-flags/${id}/toggle`, {}); queryClient.invalidateQueries({ queryKey: queryKeys.admin.featureFlags }); }
    catch (e: any) { setError(e.message); }
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
        <h3 className="m-0 text-base font-semibold">Feature Flags</h3>
        <Button variant="secondary" size="sm" onClick={() => { setShowForm(!showForm); setForm({ module: '', feature: '', enabled: false }); }}>
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="max-w-[500px] mb-4">
          <Card className="space-y-3">
            <Input label="Module" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} required placeholder="e.g. payroll" />
            <Input label="Feature" value={form.feature} onChange={(e) => setForm({ ...form, feature: e.target.value })} required placeholder="e.g. bank-transfer" />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
              Enabled
            </label>
            <Button type="submit" size="sm">Create</Button>
          </Card>
        </form>
      )}

      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
            <th className="py-2 pr-4">Module</th><th className="pr-4">Feature</th><th className="pr-4">Status</th><th></th>
          </tr></thead>
          <tbody>
            {flags.map((f: any) => (
              <tr key={f.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-3 pr-4">{f.module}</td>
                <td className="pr-4 font-mono text-xs">{f.feature}</td>
                <td className="pr-4">
                  <span className={`font-semibold ${f.enabled ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {f.enabled ? 'ON' : 'OFF'}
                  </span>
                </td>
                <td>
                  <button
                    className={`px-2 py-0.5 text-xs rounded-lg border font-medium transition-colors ${
                      f.enabled
                        ? 'border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    onClick={() => handleToggle(f.id)}
                  >
                    {f.enabled ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
            {flags.length === 0 && <tr><td colSpan={4} className="text-gray-500 dark:text-gray-400 py-3 text-center">No feature flags.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
