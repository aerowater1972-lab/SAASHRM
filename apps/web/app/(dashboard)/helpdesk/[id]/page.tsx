'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTicket, useAddTicketComment, useRateTicket, useAssignTicket, useUpdateTicketStatus } from '@/lib/hooks/helpdesk';
import { useUsers } from '@/lib/hooks/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';

function TicketDetailInner({ id }: { id: string }) {
  const { data: t, isLoading, refetch } = useTicket(id);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [assigneeId, setAssigneeId] = useState('');
  const { allowed: isAdmin } = usePermission('helpdesk:manage');
  const { data: usersPage } = useUsers({ limit: 100 }, isAdmin);
  const addComment = useAddTicketComment();
  const rate = useRateTicket();
  const assignM = useAssignTicket();
  const statusM = useUpdateTicketStatus();
  const users: any[] = isAdmin ? (((usersPage as any)?.data ?? []) as any[]) : [];
  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!t) return <p className="text-sm text-destructive">Tiket tidak ditemukan.</p>;
  const send = () => {
    if (!content.trim()) return;
    addComment.mutate({ id, data: { content: content.trim() } }, { onSuccess: () => { setContent(''); refetch(); } });
  };
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <div className="flex gap-2 mt-2">
          <Badge>{t.status}</Badge>
          <Badge variant="secondary">{t.category}</Badge>
          <Badge variant="secondary">{t.priority}</Badge>
        </div>
      </div>
      <Card><CardContent className="p-4 text-sm whitespace-pre-wrap">{t.description}</CardContent></Card>
      {isAdmin && (
        <Card><CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-sm">Aksi Admin</h2>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Assignee" className="rounded-md border px-2 py-1 text-sm"
              value={assigneeId || t.assignee?.id || ''} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">— Pilih assignee —</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={!assigneeId || assignM.isPending}
              onClick={() => assignM.mutate({ id, assignedToId: assigneeId }, { onSuccess: () => { setAssigneeId(''); refetch(); } })}>Assign</Button>
            <select aria-label="Status" className="rounded-md border px-2 py-1 text-sm" value={t.status} disabled={statusM.isPending}
              onChange={(e) => statusM.mutate({ id, status: e.target.value as any }, { onSuccess: () => refetch() })}>
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </CardContent></Card>
      )}
      <h2 className="font-semibold">Komentar ({t.comments?.length ?? 0})</h2>
      <div className="space-y-2">
        {(t.comments ?? []).map((c: any) => (
          <Card key={c.id}><CardContent className="p-3 text-sm">
            <p className="font-medium text-xs text-muted-foreground">{c.authorEmployee?.fullName || c.authorUser?.fullName || 'Pengguna'}</p>
            <p className="mt-1">{c.content}</p>
          </CardContent></Card>
        ))}
      </div>
      {t.status !== 'CLOSED' && (
        <div className="flex gap-2">
          <Input placeholder="Tulis komentar…" value={content} onChange={(e) => setContent(e.target.value)} />
          <Button onClick={send} disabled={addComment.isPending}>Kirim</Button>
        </div>
      )}
      {t.status === 'CLOSED' && !t.satisfactionRating && (
        <div className="flex items-center gap-2">
          <select className="rounded-md border px-3 py-2 text-sm" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} bintang</option>)}
          </select>
          <Button variant="outline" onClick={() => rate.mutate({ id, rating }, { onSuccess: () => refetch() })}>Beri Rating</Button>
        </div>
      )}
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams() as { id: string };
  return <RequirePermission permission="helpdesk:view"><TicketDetailInner id={id} /></RequirePermission>;
}
