'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';
import {
  useForumThread, useAddForumComment, useDeleteForumComment,
  useReactForumThread, useVoteForumPoll, useReportForumThread,
} from '@/lib/hooks/forum';
import { forumThreadTypeLabels, FORUM_REACTIONS, forumReactionLabels } from '@/lib/api/forum';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
function ThreadDetailInner() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [reaction, setReaction] = useState('LIKE');
  const { data: t, isLoading, error, refetch } = useForumThread(id);
  const { allowed: canCreate } = usePermission('forum:create');
  const addM = useAddForumComment();
  const delM = useDeleteForumComment();
  const reactM = useReactForumThread();
  const voteM = useVoteForumPoll();
  const reportM = useReportForumThread();
  const comments: any[] = t?.comments ?? [];

  const submitComment = () => {
    if (!comment.trim()) return;
    addM.mutate(
      { threadId: id, data: { content: comment.trim(), parentCommentId: replyTo || undefined } },
      { onSuccess: () => { setComment(''); setReplyTo(''); refetch(); } },
    );
  };
  const reactions: any[] = t?.reactions ?? [];
  const reactionCounts: Record<string, number> = {};
  reactions.forEach((r: any) => { reactionCounts[r.reactionType] = (reactionCounts[r.reactionType] || 0) + 1; });

  if (isLoading) return <TableSkeleton columns={1} />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!t) return <EmptyState title="Thread tidak ditemukan" description="Thread mungkin sudah dihapus." />;
  return (
    <div className="space-y-4">
      <Link href="/forum" className="text-sm text-primary hover:underline">← Kembali ke forum</Link>
      <Card><CardContent className="space-y-2 pt-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{forumThreadTypeLabels[t.type] ?? t.type}</Badge>
          {t.isPinned && <Badge>📌 Pinned</Badge>}
          {t.isLocked && <Badge variant="warning">🔒 Dikunci</Badge>}
        </div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-xs text-muted-foreground">{t.creator?.fullName || ''}</p>
        <p className="text-sm whitespace-pre-wrap">{t.content}</p>
        {t.type === 'POLL' && Array.isArray(t.pollOptions) && (
          <div className="space-y-1 border-t pt-3">
            <p className="text-sm font-medium">Polling — klik untuk vote:</p>
            {t.pollOptions.map((opt: string, i: number) => (
              <Button key={i} variant="outline" size="sm" className="mr-2" disabled={voteM.isPending}
                onClick={() => voteM.mutate({ id, optionIndex: i }, { onSuccess: () => refetch() })}>
                {opt} ({t.pollVotes?.[i] ?? 0})
              </Button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 border-t pt-3">
          <select aria-label="Reaksi" className="rounded-md border px-2 py-1 text-xs" value={reaction} onChange={(e) => setReaction(e.target.value)}>
            {FORUM_REACTIONS.map((r) => <option key={r} value={r}>{forumReactionLabels[r]}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={reactM.isPending}
            onClick={() => reactM.mutate({ id, reactionType: reaction as any }, { onSuccess: () => refetch() })}>
            Kirim Reaksi
          </Button>
          <span className="text-xs text-muted-foreground">
            {Object.entries(reactionCounts).map(([k, v]) => `${forumReactionLabels[k] ?? k}: ${v}`).join(' · ') || 'Belum ada reaksi'}
          </span>
          <Button size="sm" variant="ghost" className="ml-auto" disabled={reportM.isPending}
            onClick={() => { const r = window.prompt('Alasan laporan:'); if (r) reportM.mutate({ id, reason: r }); }}>
            Laporkan
          </Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="space-y-3 pt-4">
        <h2 className="font-semibold">Komentar ({comments.length})</h2>
        {canCreate && !t.isLocked && (
          <div className="flex gap-2">
            <input aria-label="Tulis komentar" className="flex-1 rounded-md border px-3 py-2 text-sm"
              placeholder={replyTo ? 'Balas komentar...' : 'Tulis komentar...'} value={comment} onChange={(e) => setComment(e.target.value)} />
            {replyTo && <Button size="sm" variant="ghost" onClick={() => setReplyTo('')}>Batal</Button>}
            <Button size="sm" onClick={submitComment} disabled={addM.isPending || !comment.trim()}>Kirim</Button>
          </div>
        )}
        {comments.map((c: any) => (
          <div key={c.id} className="rounded-md border px-3 py-2" style={{ marginLeft: c.depth > 0 ? Math.min(c.depth, 3) * 16 : 0 }}>
            <p className="text-xs text-muted-foreground">{c.creator?.fullName || ''}</p>
            <p className="text-sm">{c.content}</p>
            {canCreate && !t.isLocked && (
              <div className="mt-1 flex gap-2">
                <button className="text-xs text-primary hover:underline" onClick={() => setReplyTo(c.id)}>Balas</button>
                <button className="text-xs text-destructive hover:underline"
                  onClick={() => delM.mutate({ threadId: id, commentId: c.id }, { onSuccess: () => refetch() })}>Hapus</button>
              </div>
            )}
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}

export default function ForumDetailPage() {
  return <RequirePermission permission="forum:view"><ThreadDetailInner /></RequirePermission>;
}

