'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, FileText, Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/toast';
import { useDocuments, useDocumentCategories, useCreateDocumentCategory, useCreateDocument } from '@/lib/hooks/use-documents';
import { TableSkeleton, EmptyState } from '@/components/ui/data-states';
import type { HrDocument } from '@/lib/api/documents';

const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  REVIEW: 'warning',
  PUBLISHED: 'success',
  ACTIVE: 'success',
  ARCHIVED: 'secondary',
  EXPIRED: 'destructive',
};

function statusLabel(s: string) {
  return s.replace('_', ' ').toLowerCase();
}

export default function DocumentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [accessLevel, setAccessLevel] = useState('TENANT');
  const [catName, setCatName] = useState('');

  const { data: documents, isLoading, error } = useDocuments({ search: search || undefined, categoryId: categoryId || undefined });
  const { data: categories, isLoading: categoriesLoading } = useDocumentCategories();
  const createCategory = useCreateDocumentCategory();
  const createDoc = useCreateDocument();
  const [creating, setCreating] = useState(false);

  const handleCreateCategory = async () => {
    if (!catName.trim()) return;
    setCreating(true);
    try {
      await createCategory.mutateAsync({ name: catName.trim() });
      toast('Kategori berhasil dibuat', 'success');
      setCatName('');
      setShowNewCategory(false);
    } catch (e: any) {
      toast(e?.message ?? 'Gagal membuat kategori', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Management</h1>
          <p className="text-sm text-muted-foreground">Kelola kontrak, SOP, dan kebijakan perusahaan</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNewCategory} onOpenChange={setShowNewCategory}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Folder className="mr-2 h-4 w-4" /> Kategori
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Kategori Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="catName">Nama Kategori</Label>
                  <Input id="catName" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="cth: Kontrak" />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Batal</Button>
                  </DialogClose>
                  <Button onClick={handleCreateCategory} disabled={creating || !catName.trim()}>
                    Simpan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Dokumen Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buat Dokumen Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="docTitle">Judul</Label>
                  <Input id="docTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul dokumen" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docDesc">Deskripsi</Label>
                  <Input id="docDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="docCategory">Kategori</Label>
                    <select
                      id="docCategory"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Tanpa kategori</option>
                      {(categories ?? []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="docAccess">Akses</Label>
                    <select
                      id="docAccess"
                      value={accessLevel}
                      onChange={(e) => setAccessLevel(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="PRIVATE">Pribadi</option>
                      <option value="DEPARTMENT">Departemen</option>
                      <option value="TENANT">Seluruh Tenant</option>
                      <option value="PUBLIC">Publik</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docTags">Tags (pisahkan dengan koma)</Label>
                  <Input id="docTags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="SOP, Absensi" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docContent">Konten (Markdown)</Label>
                  <textarea aria-label="Konten (Markdown)"
                    id="docContent"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    placeholder="# Judul dokumen&#10;&#10;Isi konten di sini..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Batal</Button>
                  </DialogClose>
                  <Button
                    disabled={!title.trim()}
                    onClick={async () => {
                      try {
                        const created = await createDoc.mutateAsync({ title, description, content, accessLevel, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), categoryId: categoryId || undefined });
                        toast('Dokumen berhasil dibuat', 'success');
                        setShowNew(false);
                        setTitle(''); setDescription(''); setContent(''); setTags(''); setAccessLevel('TENANT');
                        router.push(`/documents/${created.id}`);
                      } catch (e: any) {
                        toast(e?.message ?? 'Gagal membuat dokumen', 'error');
                      }
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari dokumen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua kategori</option>
          {(categories ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <div className="text-destructive">Gagal memuat dokumen.</div>}
      {!isLoading && (!documents || documents.length === 0) && (
        <EmptyState
          title="Belum ada dokumen"
          description="Buat dokumen pertama Anda seperti kontrak kerja, SOP, atau kebijakan perusahaan."
          action={{ label: 'Buat Dokumen', onClick: () => setShowNew(true) }}
        />
      )}

      {!isLoading && documents && documents.length > 0 && (
        <Card>
          <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
            <span className="col-span-5">Judul</span>
            <span className="col-span-2">Kategori</span>
            <span className="col-span-1">Versi</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Diperbarui</span>
          </div>
          {documents.map((doc: HrDocument) => (
            <button
              key={doc.id}
              onClick={() => router.push(`/documents/${doc.id}`)}
              className="w-full grid grid-cols-12 gap-4 p-4 text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0 text-left"
            >
              <span className="col-span-5 font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                {doc.title}
              </span>
              <span className="col-span-2 text-muted-foreground">{doc.category?.name ?? '—'}</span>
              <span className="col-span-1 text-muted-foreground">{doc.version}</span>
              <span className="col-span-2">
                <Badge variant={(statusVariant[doc.status] as any) || 'secondary'}>{statusLabel(doc.status)}</Badge>
              </span>
              <span className="col-span-2 text-muted-foreground">{new Date(doc.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
        </Card>
      )}

      <span className="hidden">{categoriesLoading ? 'loading' : ''}</span>
    </div>
  );
}