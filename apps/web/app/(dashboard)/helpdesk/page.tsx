'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMyTickets, useHelpdeskStats, useCreateTicket } from '@/lib/hooks/helpdesk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus } from 'lucide-react';

import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';

function HelpdeskInner() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { data, isLoading, error, refetch } = useMyTickets({ status: status || undefined, page, limit: 20 });
  const { allowed: isAdmin } = usePermission('helpdesk:manage');
  const { data: stats } = useHelpdeskStats(isAdmin);
  const createMutation = useCreateTicket();
  const items = data?.items ?? [];
  const submit = () => {
    if (!title.trim() || !description.trim()) return;
    createMutation.mutate({ title: title.trim(), description: description.trim(), category: 'OTHER' as any }, {
      onSuccess: () => { setShowNew(false); setTitle(''); setDescription(''); refetch(); },
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Helpdesk HR</h1>
          <p className="text-sm text-muted-foreground">Tiket bantuan karyawan</p>
        </div>
        <div className="flex gap-2">
          <Link href="/helpdesk/kb"><Button variant="outline">Knowledge Base</Button></Link>
          <Button onClick={() => setShowNew(true)}><Plus className="mr-2 h-4 w-4" />Buat Tiket</Button>
        </div>
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Total', stats.total ?? 0], ['Open', stats.byStatus?.OPEN ?? 0], ['Resolved', stats.byStatus?.RESOLVED ?? 0], ['Overdue', stats.overdue ?? 0]].map(([l, v]) => (
            <Card key={l as string}><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{v as number}</p>
              <p className="text-xs text-muted-foreground">{l as string}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
      <select className="rounded-md border px-3 py-2 text-sm w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">Semua status</option>
        <option value="OPEN">OPEN</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="RESOLVED">RESOLVED</option>
        <option value="CLOSED">CLOSED</option>
      </select>
      {isLoading && <TableSkeleton columns={4} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="Belum ada tiket" description="Buat tiket baru untuk meminta bantuan HR." />
      )}
      {!isLoading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Judul</TableHead><TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead><TableHead>Komentar</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/helpdesk/${t.id}`} className="font-medium text-primary hover:underline">{t.title}</Link>
                    <p className="text-xs text-muted-foreground">{t.employee?.fullName || ''}</p>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{t.category}</Badge></TableCell>
                  <TableCell><Badge variant={t.status === 'OPEN' ? 'warning' : 'secondary'}>{t.status}</Badge></TableCell>
                  <TableCell>{t._count?.comments ?? '—'}</TableCell>
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
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNew(false)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-3">
              <h2 className="text-lg font-semibold">Buat Tiket Baru</h2>
              <Input placeholder="Judul tiket" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="w-full rounded-md border px-3 py-2 text-sm min-h-28" placeholder="Jelaskan masalah Anda…" value={description} onChange={(e) => setDescription(e.target.value)} />
              {createMutation.error && <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNew(false)}>Batal</Button>
                <Button onClick={submit} disabled={createMutation.isPending || !title.trim() || !description.trim()}>
                  {createMutation.isPending ? 'Menyimpan…' : 'Kirim Tiket'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function HelpdeskPage() {
  return <RequirePermission permission="helpdesk:view"><HelpdeskInner /></RequirePermission>;
}
