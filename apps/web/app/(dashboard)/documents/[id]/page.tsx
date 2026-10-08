'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Send, Check, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TableSkeleton, PageSkeleton } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import {
  useDocument,
  useUpdateDocumentStatus,
  useCreateDocumentVersion,
  useAddDocumentPermission,
  useRequestDocumentSignature,
  useDocumentActivities,
} from '@/lib/hooks/use-documents';

const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  REVIEW: 'warning',
  PUBLISHED: 'success',
  ACTIVE: 'success',
  ARCHIVED: 'secondary',
  EXPIRED: 'destructive',
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id;

  const { data: doc, isLoading, error } = useDocument(id);
  const { data: activities, isLoading: activitiesLoading } = useDocumentActivities(id);
  const updateStatus = useUpdateDocumentStatus();
  const createVersion = useCreateDocumentVersion();
  const addPermission = useAddDocumentPermission();
  const requestSignature = useRequestDocumentSignature();

  const [versionContent, setVersionContent] = useState('');
  const [changeLog, setChangeLog] = useState('');
  const [permType, setPermType] = useState('ROLE');
  const [targetId, setTargetId] = useState('');
  const [permLevel, setPermLevel] = useState('VIEW');
  const [signUserId, setSignUserId] = useState('');

  if (isLoading) return <TableSkeleton rows={5} columns={3} />;
  if (error) return <div className="text-destructive">Gagal memuat dokumen.</div>;
  if (!doc) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.push('/documents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
              <Badge variant={(statusVariant[doc.status] as any) || 'secondary'}>{doc.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {doc.category?.name ?? 'Tanpa kategori'} · Versi {doc.version}
              {doc.creator?.fullName ? ` · oleh ${doc.creator.fullName}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc.status !== 'PUBLISHED' && doc.status !== 'ARCHIVED' && (
            <Button onClick={() => updateStatus.mutateAsync({ id, status: 'PUBLISHED' }).then(() => toast('Dokumen dipublikasikan', 'success'))}>
              <Send className="mr-2 h-4 w-4" /> Publikasikan
            </Button>
          )}
          {doc.status === 'PUBLISHED' && (
            <Button variant="outline" onClick={() => updateStatus.mutateAsync({ id, status: 'ARCHIVED' }).then(() => toast('Dokumen diarsipkan', 'success'))}>
              Arsipkan
            </Button>
          )}
        </div>
      </div>

      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {doc.tags.map((t) => (
            <Badge key={t} variant="outline">{t}</Badge>
          ))}
        </div>
      )}

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Konten</TabsTrigger>
          <TabsTrigger value="versions">Riwayat Versi</TabsTrigger>
          <TabsTrigger value="permissions">Akses</TabsTrigger>
          <TabsTrigger value="signatures">Tanda Tangan</TabsTrigger>
          <TabsTrigger value="activity">Aktivitas</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {doc.content || <span className="text-muted-foreground">Tidak ada konten</span>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Buat Versi Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buat Versi Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="verContent">Konten baru (Markdown)</Label>
                  <textarea
                    id="verContent"
                    value={versionContent}
                    onChange={(e) => setVersionContent(e.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="changelog">Catatan perubahan</Label>
                  <Input id="changelog" value={changeLog} onChange={(e) => setChangeLog(e.target.value)} placeholder="cth: Menambahkan prosedur baru" />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Batal</Button>
                  </DialogClose>
                  <Button
                    disabled={!versionContent.trim()}
                    onClick={async () => {
                      try {
                        await createVersion.mutateAsync({ id, data: { content: versionContent, changeLog } });
                        toast('Versi baru dibuat', 'success');
                        setVersionContent(''); setChangeLog('');
                      } catch (e: any) {
                        toast(e?.message ?? 'Gagal membuat versi', 'error');
                      }
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            {doc.versions && doc.versions.length > 0 ? (
              doc.versions.map((v) => (
                <div key={v.id} className="border-b last:border-b-0 p-4 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-mono font-medium">v{v.version}</span>
                    <span className="text-muted-foreground ml-3">{v.changeLog ?? (v.title || '')}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{new Date(v.createdAt).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-muted-foreground text-sm">Belum ada versi</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Tambah Akses
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Hak Akses</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="permType">Tipe</Label>
                  <select id="permType" value={permType} onChange={(e) => setPermType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="ROLE">Role</option>
                    <option value="USER">User</option>
                    <option value="DEPARTMENT">Departemen</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetId">ID Target</Label>
                  <Input id="targetId" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="cth: nsm-role-hr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permLevel">Level Akses</Label>
                  <select id="permLevel" value={permLevel} onChange={(e) => setPermLevel(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="VIEW">Lihat</option>
                    <option value="EDIT">Edit</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Batal</Button>
                  </DialogClose>
                  <Button
                    disabled={!targetId.trim()}
                    onClick={async () => {
                      try {
                        await addPermission.mutateAsync({ id, data: { permissionType: permType, targetId, permission: permLevel } });
                        toast('Akses ditambahkan', 'success');
                        setTargetId('');
                      } catch (e: any) {
                        toast(e?.message ?? 'Gagal menambah akses', 'error');
                      }
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            {doc.permissions && doc.permissions.length > 0 ? (
              doc.permissions.map((p) => (
                <div key={p.id} className="border-b last:border-b-0 p-4 text-sm flex items-center justify-between">
                  <span>
                    <Badge variant="outline">{p.permissionType}</Badge>
                    <span className="ml-2 font-mono">{p.targetId}</span>
                  </span>
                  <Badge>{p.permission}</Badge>
                </div>
              ))
            ) : (
              <div className="p-6 text-muted-foreground text-sm">Belum ada hak akses khusus</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="signatures" className="space-y-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Check className="mr-2 h-4 w-4" /> Minta Tanda Tangan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Minta Tanda Tangan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="signUser">User ID</Label>
                  <Input id="signUser" value={signUserId} onChange={(e) => setSignUserId(e.target.value)} placeholder="cth: nsm-user-hr" />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Batal</Button>
                  </DialogClose>
                  <Button
                    disabled={!signUserId.trim()}
                    onClick={async () => {
                      try {
                        await requestSignature.mutateAsync({ id, userIds: [signUserId] });
                        toast('Permintaan tanda tangan dikirim', 'success');
                        setSignUserId('');
                      } catch (e: any) {
                        toast(e?.message ?? 'Gagal meminta tanda tangan', 'error');
                      }
                    }}
                  >
                    Kirim
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            {doc.signatures && doc.signatures.length > 0 ? (
              doc.signatures.map((s) => (
                <div key={s.id} className="border-b last:border-b-0 p-4 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Badge variant={s.status === 'SIGNED' ? 'success' : 'secondary'}>{s.status}</Badge>
                    <span className="text-muted-foreground">{s.user?.fullName ?? s.userId}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {s.signedAt ? new Date(s.signedAt).toLocaleString() : 'Menunggu'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-muted-foreground text-sm">Belum ada permintaan tanda tangan</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            {activitiesLoading && <div className="p-4 text-muted-foreground text-sm">Loading…</div>}
            {!activitiesLoading && activities && activities.length > 0 ? (
              activities.map((a) => (
                <div key={a.id} className="border-b last:border-b-0 p-4 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{a.action}</Badge>
                    <span className="text-muted-foreground">{a.user?.fullName ?? a.userId}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-muted-foreground text-sm">Belum ada aktivitas</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}