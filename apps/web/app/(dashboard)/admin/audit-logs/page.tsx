'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/lib/hooks/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';

const modules = ['employee', 'attendance', 'payroll', 'expense', 'leave', 'recruitment', 'performance', 'asset', 'benefit', 'resignation', 'learning', 'admin'];

export default function AuditLogsPage() {
  const [module, setModule] = useState('');
  const { data: logsData, isLoading, error, refetch } = useAuditLogs();

  const logs = logsData?.data ?? [];

  const filtered = module ? logs.filter((l: any) => l.module === module) : logs;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Riwayat perubahan data di seluruh sistem</p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Semua Modul</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState title="Belum ada audit log" description="Log akan muncul saat ada perubahan data." />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Modul</th>
                    <th className="px-4 py-3 font-medium">Entitas</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                    <th className="px-4 py-3 font-medium">Diubah Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(l.changedAt).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{l.module}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {l.entity} <span className="text-muted-foreground">#{l.entityId?.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{l.action}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{l.changedBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
