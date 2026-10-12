'use client';
import { useParams } from 'next/navigation';
import { RequirePermission } from '@/components/require-permission';

import { useKbArticle, useRateKbArticle } from '@/lib/hooks/helpdesk';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function KbArticlePage() {
  const { id } = useParams() as { id: string };
  return <RequirePermission permission="helpdesk:view"><KbArticleInner id={id} /></RequirePermission>;
}

function KbArticleInner({ id }: { id: string }) {
  const { data: a, isLoading, refetch } = useKbArticle(id);
  const rate = useRateKbArticle();
  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!a) return <p className="text-sm text-destructive">Artikel tidak ditemukan.</p>;
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">{a.title}</h1>
      {a.category && <Badge variant="secondary">{a.category}</Badge>}
      <Card><CardContent className="p-4 text-sm whitespace-pre-wrap">{a.content}</CardContent></Card>
      <div className="flex gap-2 text-sm">
        <span className="text-muted-foreground">Apakah artikel ini membantu?</span>
        <Button size="sm" variant="outline" onClick={() => rate.mutate({ id, helpful: true }, { onSuccess: () => refetch() })}>Ya</Button>
        <Button size="sm" variant="outline" onClick={() => rate.mutate({ id, helpful: false }, { onSuccess: () => refetch() })}>Tidak</Button>
      </div>
    </div>
  );
}
