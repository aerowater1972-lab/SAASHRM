'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuditLogs } from '@/hooks/use-admin';

interface AuditLog { id: string; module: string; entity: string; entityId: string; action: string; changedBy: string; changedAt: string; oldValue?: any; newValue?: any; }

export default function AuditLogsPage() {
  const pathname = usePathname();
  const { data: logsData = [], isLoading, error: fetchError } = useAuditLogs();
  const logs = logsData as AuditLog[];
  const [module, setModule] = useState('');

  const filteredLogs = module ? logs.filter((l: any) => l.module === module) : logs;

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
        <Link href="/admin/audit-logs" className={linkClass(pathname === '/admin/audit-logs')}>Audit Logs</Link>
        <Link href="/admin/workflows" className={linkClass(pathname.startsWith('/admin/workflows'))}>Workflows</Link>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <h3 className="m-0 text-base font-semibold">Audit Logs</h3>
        <select value={module} onChange={(e) => setModule(e.target.value)} className="ml-4 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <option value="">All Modules</option>
          <option>employee</option><option>attendance</option><option>payroll</option>
          <option>expense</option><option>leave</option><option>recruitment</option>
          <option>performance</option><option>asset</option><option>benefit</option>
          <option>resignation</option><option>learning</option><option>admin</option>
        </select>
      </div>

      {fetchError && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{fetchError instanceof Error ? fetchError.message : 'Failed to load'}</div>}
      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead><tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="py-2 pr-4">Time</th><th className="pr-4">Module</th><th className="pr-4">Entity</th><th className="pr-4">Action</th><th className="pr-4">Changed By</th><th>Changes</th>
            </tr></thead>
            <tbody>
              {filteredLogs.map((l: any) => (
                <tr key={l.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(l.changedAt).toLocaleString('id-ID')}</td>
                  <td className="pr-4">{l.module}</td>
                  <td className="pr-4">{l.entity} #{l.entityId.slice(0, 8)}</td>
                  <td className="pr-4">{l.action}</td>
                  <td className="pr-4 text-[11px]">{l.changedBy}</td>
                  <td className="text-[11px] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {l.oldValue || l.newValue ? 'View details' : '—'}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && <tr><td colSpan={6} className="text-gray-500 dark:text-gray-400 py-3 text-center">No audit logs.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
