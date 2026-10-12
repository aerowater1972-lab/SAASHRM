'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RequirePermission } from '@/components/require-permission';
import { useTicketQueue, useAssignTicket, useUpdateTicketStatus } from '@/lib/hooks/helpdesk';
import { useUsers } from '@/lib/hooks/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import type { TicketStatus } from '@/lib/api/helpdesk';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function QueueInner() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { data, isLoading, error, refetch } = useTicketQueue({ status: status || undefined, page, limit: 20 });
  const { data: usersPage } = useUsers({ limit: 100 });
  const assignM = useAssignTicket();
  const statusM = useUpdateTicketStatus();
  const items = data?.items ?? [];
  const users: any[] = (usersPage as any)?.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Antrian Helpdesk</h1>
          <p className="text-sm text-muted-foreground">Kelola semua tiket (admin)</p>
        </div>
        <Link href="/helpdesk"><Button variant="outline">Tiket Saya</Button></Link>
      </div>
      <select aria-label="Filter status" className="rounded-md border px-3 py-2 text-sm w-48"
        value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">Semua status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {isLoading && <TableSkeleton columns={4} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="Antrian kosong" description="Tidak ada tiket." />
      )}
      {!isLoading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tiket</TableHead><TableHead>Status</TableHead>
              <TableHead>Assign</TableHead><TableHead>Ubah Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/helpdesk/${t.id}`} className="font-medium text-primary hover:underline">{t.title}</Link>
                    <p className="text-xs text-muted-foreground">{t.employee?.fullName || ''} &middot; {t.category} &middot; {t.priority}</p>
                  </TableCell>
                  <TableCell><Badge variant={t.status === 'OPEN' ? 'warning' : 'secondary'}>{t.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <select aria-label="Assignee" className="rounded-md border px-2 py-1 text-xs max-w-32"
                        value={draft[t.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [t.id]: e.target.value }))}>
                        <option value="">— Pilih —</option>
                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
                      </select>
                      <Button size="sm" variant="outline" disabled={!draft[t.id] || assignM.isPending}
                        onClick={() => assignM.mutate({ id: t.id, assignedToId: draft[t.id] }, { onSuccess: () => refetch() })}>OK</Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <select aria-label="Status" className="rounded-md border px-2 py-1 text-xs" value={t.status} disabled={statusM.isPending}
                      onChange={(e) => statusM.mutate({ id: t.id, status: e.target.value as TicketStatus }, { onSuccess: () => refetch() })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Halaman {data.page} dari {data.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HelpdeskQueuePage() {
  return <RequirePermission permission="helpdesk:manage"><QueueInner /></RequirePermission>;
}
