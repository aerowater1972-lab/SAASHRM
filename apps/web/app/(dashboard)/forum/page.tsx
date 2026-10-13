'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RequirePermission } from '@/components/require-permission';
import { useForumThreads, useCreateForumThread } from '@/lib/hooks/forum';
import { FORUM_THREAD_TYPES, forumThreadTypeLabels } from '@/lib/api/forum';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus } from 'lucide-react';

function formatDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function ForumInner() {
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newType, setNewType] = useState('DISCUSSION');

  const { data, isLoading, error, refetch } = useForumThreads({
    type: type || undefined,
    q: q.trim() || undefined,
    page,
    limit: 20,
  });
  const createM = useCreateForumThread();
  const items = data?.items ?? [];
  const totalPages = (data as any)?.totalPages ?? 1;
  const curPage = (data as any)?.page ?? page;

  const submit = () => {
    if (!title.trim() || !content.trim()) return;
    createM.mutate(
      { title: title.trim(), content: content.trim(), type: newType as any },
      { onSuccess: () => { setTitle(''); setContent(''); setShowNew(false); refetch(); } },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forum Internal</h1>
          <p className="text-sm text-muted-foreground">Diskusi, polling, dan pengumuman antar karyawan</p>
        </div>
        <Button onClick={() => setShowNew((v) => !v)}><Plus className="mr-2 h-4 w-4" /> Thread Baru</Button>
      </div>
      {showNew && (
        <Card><CardContent className="space-y-3 pt-4">
          <Input placeholder="Judul thread" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea aria-label="Isi thread" className="w-full rounded-md border px-3 py-2 text-sm min-h-24"
            placeholder="Tulis isi diskusi..." value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex gap-2">
            <select aria-label="Tipe thread" className="rounded-md border px-3 py-2 text-sm"
              value={newType} onChange={(e) => setNewType(e.target.value)}>
              {FORUM_THREAD_TYPES.filter((t) => t !== 'ANNOUNCEMENT').map((t) => (
                <option key={t} value={t}>{forumThreadTypeLabels[t]}</option>
              ))}
            </select>
            <Button onClick={submit} disabled={createM.isPending || !title.trim() || !content.trim()}>
              {createM.isPending ? 'Menyimpan...' : 'Terbitkan'}
            </Button>
          </div>
        </CardContent></Card>
      )}
      <div className="flex gap-2">
        <select aria-label="Filter tipe" className="rounded-md border px-3 py-2 text-sm w-48"
          value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">Semua tipe</option>
          {FORUM_THREAD_TYPES.map((t) => <option key={t} value={t}>{forumThreadTypeLabels[t]}</option>)}
        </select>
        <Input placeholder="Cari thread..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
      </div>
      {isLoading && <TableSkeleton columns={4} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="Belum ada thread" description="Mulai diskusi pertama di forum internal." />
      )}
      {!isLoading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Thread</TableHead><TableHead>Tipe</TableHead>
              <TableHead>Komentar</TableHead><TableHead>Dibuat</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/forum/${t.id}`} className="font-medium text-primary hover:underline">
                      {t.isPinned ? '📌 ' : ''}{t.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{t.creator?.fullName || ''}{t.isLocked ? ' · 🔒 Dikunci' : ''}</p>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{forumThreadTypeLabels[t.type] ?? t.type}</Badge></TableCell>
                  <TableCell>{t._count?.comments ?? t.commentCount ?? '—'}</TableCell>
                  <TableCell>{formatDate(t.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Halaman {curPage} dari {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ForumPage() {
  return <RequirePermission permission="forum:view"><ForumInner /></RequirePermission>;
}

