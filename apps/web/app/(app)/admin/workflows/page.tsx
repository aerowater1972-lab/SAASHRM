'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWorkflows } from '@/hooks/use-admin';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface WorkflowState { id: string; name: string; type: string; isInitial: boolean; isFinal: boolean; }
interface WorkflowTransition { id: string; name: string; fromStateId: string; toStateId: string; requiredRole?: string; }
interface Workflow { id: string; name: string; entityType: string; isActive: boolean; states: WorkflowState[]; transitions: WorkflowTransition[]; }

export default function WorkflowsPage() {
  const pathname = usePathname();
  const { data: workflows = [], isLoading } = useWorkflows();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleToggle(id: string) {
    try { await api.post(`/admin/workflows/${id}/activate`, {}); queryClient.invalidateQueries({ queryKey: queryKeys.admin.workflows }); }
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
        <Link href="/admin/workflows" className={linkClass(pathname === '/admin/workflows')}>Workflows</Link>
      </div>

      <h3 className="m-0 mb-4 text-base font-semibold">Workflow Definitions</h3>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}
      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}

      {!isLoading && workflows.map((w: any) => (
        <Card key={w.id} className="max-w-[700px] mb-3">
          <div className="flex justify-between items-center">
            <div>
              <strong>{w.name}</strong> <span className="text-xs text-gray-500 dark:text-gray-400">({w.entityType})</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`text-xs font-medium ${w.isActive ? 'text-green-600' : 'text-red-500'}`}>{w.isActive ? 'Active' : 'Inactive'}</span>
              <Button variant="secondary" size="sm" onClick={() => handleToggle(w.id)}>
                {w.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
                {expanded === w.id ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </div>

          {expanded === w.id && (
            <div className="mt-3 text-xs">
              <div className="mb-2"><strong>States</strong> ({w.states.length})</div>
              <div className="flex gap-2 flex-wrap mb-3">
                {w.states.map((s: any) => (
                  <span key={s.id} className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.isInitial ? 'bg-green-100 text-green-600' : s.isFinal ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'
                  }`}>{s.name} ({s.type})</span>
                ))}
              </div>
              <div className="mb-1"><strong>Transitions</strong> ({w.transitions.length})</div>
              {w.transitions.map((t: any) => (
                <div key={t.id} className="text-xs py-0.5">
                  {t.name} → {t.requiredRole ? `[${t.requiredRole}] ` : ''}
                  <span className="text-gray-500 dark:text-gray-400">(state: {t.fromStateId.slice(0, 8)} → {t.toStateId.slice(0, 8)})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
