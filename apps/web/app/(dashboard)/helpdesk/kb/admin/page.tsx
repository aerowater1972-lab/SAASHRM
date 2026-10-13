'use client';
import { RequirePermission } from '@/components/require-permission';
import { useState } from 'react';
import {
  useKbArticlesAdmin,
  useCreateKbArticle,
  useUpdateKbArticle,
  useDeleteKbArticle,
} from '@/lib/hooks/helpdesk';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, TableSkeleton } from '@/components/ui/data-states';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { KbArticlePayload } from '@/lib/api/helpdesk';

const EMPTY: KbArticlePayload = { title: '', content: '', category: undefined, tags: [] };

export default function KbAdminPage() {
  return <RequirePermission permission="helpdesk:manage"><KbAdminInner /></RequirePermission>;
}

function KbAdminInner() {
  const [filter, setFilter] = useState('');
  const { data = [], isLoading, refetch } = useKbArticlesAdmin();
  const [editing, setEditing] = useState<{ id: string | null; form: KbArticlePayload } | null>(null);
  const createMut = useCreateKbArticle();
  const updateMut = useUpdateKbArticle();
  const deleteMut = useDeleteKbArticle();

  const list = (data as any[]).filter((a) =>
    filter.trim() ? a.title?.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  const openCreate = () => setEditing({ id: null, form: { ...EMPTY } });
  const openEdit = (a: any) =>
    setEditing({ id: a.id, form: { title: a.title, content: a.content, category: a.category, tags: a.tags ?? [] } });

  const save = async () => {
    if (!editing || !editing.form.title.trim() || !editing.form.content.trim()) return;
    if (editing.id) await updateMut.mutateAsync({ id: editing.id, data: editing.form });
    else await createMut.mutateAsync(editing.form);
    setEditing(null);
    refetch();
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus artikel ini?')) return;
    await deleteMut.mutateAsync(id);
    refetch();
  };

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Kelola Knowledge Base</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Artikel Baru</Button>
      </div>
      <Input placeholder="Filter judul…" className="max-w-md" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {isLoading && <TableSkeleton columns={3} />}
      {!isLoading && list.length === 0 && <EmptyState title="Belum ada artikel" description="Buat artikel bantuan pertama." />}
      {!isLoading && list.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((a: any) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{a.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">{a.content?.slice(0, 160)}</p>
                <div className="flex items-center gap-2">
                  {a.category && <Badge variant="secondary">{a.category}</Badge>}
                  <span className="ml-auto flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm" onClick={() => remove(a.id)} disabled={busy}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editing.id ? 'Ubah Artikel' : 'Artikel Baru'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Judul artikel"
              value={editing.form.title}
              onChange={(e) => setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })}
            />
            <textarea
              placeholder="Isi artikel (markdown didukung)"
              rows={8}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={editing.form.content}
              onChange={(e) => setEditing({ ...editing, form: { ...editing.form, content: e.target.value } })}
            />
            <Input
              placeholder="Tags (pisahkan koma)"
              value={(editing.form.tags ?? []).join(', ')}
              onChange={(e) =>
                setEditing({ ...editing, form: { ...editing.form, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) } })
              }
            />
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy || !editing.form.title.trim() || !editing.form.content.trim()}>
                {busy ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
