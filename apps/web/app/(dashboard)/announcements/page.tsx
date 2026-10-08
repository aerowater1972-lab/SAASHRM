'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Bell, Send, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TableSkeleton, EmptyState } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import { useAnnouncements, useAnnouncementStats, useCreateAnnouncement, usePublishAnnouncement, useDeleteAnnouncement } from '@/lib/hooks/use-announcements';
import type { Announcement, AnnouncementTypeCode, AnnouncementPriorityCode } from '@/lib/api/announcements';

const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
};

const priorityVariant: Record<string, 'destructive' | 'success' | 'secondary' | 'warning'> = {
  LOW: 'secondary',
  NORMAL: 'success',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

const typeLabels: Record<AnnouncementTypeCode, string> = {
  GENERAL: 'Umum',
  URGENT: 'Mendesak',
  EVENT: 'Acara',
  POLICY: 'Kebijakan',
  MAINTENANCE: 'Pemeliharaan',
  CELEBRATION: 'Perayaan',
};

const priorityLabels: Record<AnnouncementPriorityCode, string> = {
  LOW: 'Rendah',
  NORMAL: 'Normal',
  HIGH: 'Tinggi',
  CRITICAL: 'Kritis',
};

export default function AnnouncementsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<AnnouncementTypeCode>('GENERAL');
  const [priority, setPriority] = useState<AnnouncementPriorityCode>('NORMAL');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [publishAt, setPublishAt] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [readReceipt, setReadReceipt] = useState(false);

  const { data: announcements, isLoading, error } = useAnnouncements({ search: search || undefined, status: status || undefined });
  const { data: stats } = useAnnouncementStats();
  const createAnnouncement = useCreateAnnouncement();
  const publishAnnouncement = usePublishAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setCreating(true);
    try {
      await createAnnouncement.mutateAsync({
        title,
        content,
        type,
        priority,
        targetAudience,
        publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
        expireAt: expireAt ? new Date(expireAt).toISOString() : undefined,
        readReceiptRequired: readReceipt,
      });
      toast('Pengumuman berhasil dibuat', 'success');
      setShowNew(false);
      setTitle(''); setContent(''); setType('GENERAL'); setPriority('NORMAL');
      setTargetAudience('ALL'); setPublishAt(''); setExpireAt(''); setReadReceipt(false);
    } catch (e: any) {
      toast(e?.message ?? 'Gagal membuat pengumuman', 'error');
    } finally {
      setCreating(false);
    }
  };

  const statsCards = [
    { label: 'Total', value: stats?.total ?? 0 },
    { label: 'Terbit', value: stats?.published ?? 0 },
    { label: 'Terjadwal', value: stats?.scheduled ?? 0 },
    { label: 'Draft', value: stats?.drafts ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">Komunikasi internal untuk seluruh karyawan</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Pengumuman Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Buat Pengumuman</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="annTitle">Judul</Label>
                <Input id="annTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul pengumuman" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annContent">Isi Pengumuman</Label>
                <textarea aria-label="Isi Pengumuman"
                  id="annContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Tulis isi pengumuman..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annType">Tipe</Label>
                  <select id="annType" value={type} onChange={(e) => setType(e.target.value as AnnouncementTypeCode)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annPriority">Prioritas</Label>
                  <select id="annPriority" value={priority} onChange={(e) => setPriority(e.target.value as AnnouncementPriorityCode)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annAudience">Target Audience</Label>
                  <select id="annAudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="ALL">Semua Karyawan</option>
                    <option value="DEPARTMENT">Departemen</option>
                    <option value="ROLE">Role</option>
                    <option value="USER">User</option>
                    <option value="LOCATION">Lokasi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annRead">Konfirmasi Baca</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="annRead"
                      type="checkbox"
                      checked={readReceipt}
                      onChange={(e) => setReadReceipt(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm text-muted-foreground">Wajib konfirmasi dibaca</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annPublish">Jadwal Terbit</Label>
                  <Input id="annPublish" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annExpire">Kadaluarsa</Label>
                  <Input id="annExpire" type="datetime-local" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Batal</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={creating || !title.trim() || !content.trim()}>
                  Simpan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsCards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari pengumuman..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua status</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Terjadwal</option>
          <option value="PUBLISHED">Terbit</option>
          <option value="ARCHIVED">Diarsipkan</option>
        </select>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <div className="text-destructive">Gagal memuat pengumuman.</div>}
      {!isLoading && (!announcements || announcements.length === 0) && (
        <EmptyState
          title="Belum ada pengumuman"
          description="Buat pengumuman pertama untuk karyawan Anda."
          action={{ label: 'Buat Pengumuman', onClick: () => setShowNew(true) }}
        />
      )}

      {!isLoading && announcements && announcements.length > 0 && (
        <Card>
          {announcements.map((ann: Announcement) => (
            <div key={ann.id} className="border-b last:border-b-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  className="flex-1 text-left"
                  onClick={() => router.push(`/announcements/${ann.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ann.title}</span>
                    <Badge variant={(priorityVariant[ann.priority] as any) || 'secondary'}>{priorityLabels[ann.priority] ?? ann.priority}</Badge>
                    <Badge variant={(statusVariant[ann.status] as any) || 'secondary'}>{ann.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ann.content}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {typeLabels[ann.type] ?? ann.type} · {ann.creator?.fullName ?? '—'}
                    {' '}· {ann.publishAt ? new Date(ann.publishAt).toLocaleDateString() : 'Belum terjadwal'}
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {ann.status !== 'PUBLISHED' && (
                    <Button
                      size="icon" aria-label="Terbitkan sekarang"
                      variant="ghost"
                      title="Terbitkan sekarang"
                      onClick={() => publishAnnouncement.mutateAsync(ann.id).then(() => toast('Diterbitkan', 'success'))}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon" aria-label="Hapus"
                    variant="ghost"
                    title="Hapus"
                    onClick={() => deleteAnnouncement.mutateAsync(ann.id).then(() => toast('Dihapus', 'success'))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}