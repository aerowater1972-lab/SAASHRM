'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import { useAnnouncement, usePublishAnnouncement, useDeleteAnnouncement } from '@/lib/hooks/use-announcements';

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

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id;

  const { data: ann, isLoading, error } = useAnnouncement(id);
  const publishAnnouncement = usePublishAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  if (isLoading) return <TableSkeleton rows={5} columns={3} />;
  if (error) return <div className="text-destructive">Gagal memuat pengumuman.</div>;
  if (!ann) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/announcements')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{ann.title}</h1>
              <Badge variant={(priorityVariant[ann.priority] as any) || 'secondary'}>{ann.priority}</Badge>
              <Badge variant={(statusVariant[ann.status] as any) || 'secondary'}>{ann.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {ann.type} · Target: {ann.targetAudience} · oleh {ann.creator?.fullName ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ann.status !== 'PUBLISHED' && (
            <Button
              onClick={() =>
                publishAnnouncement.mutateAsync(id).then(() => toast('Pengumuman diterbitkan', 'success'))
              }
            >
              <Send className="mr-2 h-4 w-4" /> Terbitkan
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() =>
              deleteAnnouncement.mutateAsync(id).then(() => {
                toast('Pengumuman dihapus', 'success');
                router.push('/announcements');
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Hapus
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Tipe</div>
              <div className="font-medium">{ann.type}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Prioritas</div>
              <div className="font-medium">{ann.priority}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Terbit</div>
              <div className="font-medium">{ann.publishAt ? new Date(ann.publishAt).toLocaleString() : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Kadaluarsa</div>
              <div className="font-medium">{ann.expireAt ? new Date(ann.expireAt).toLocaleString() : '—'}</div>
            </div>
          </div>

          <div className="whitespace-pre-wrap text-sm leading-relaxed">{ann.content}</div>

          {ann.attachmentUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ann.attachmentUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Lampiran {i + 1}
                </a>
              ))}
            </div>
          )}

          {ann.readReceiptRequired && (
            <div className="text-xs text-muted-foreground">
              Konfirmasi baca diwajibkan untuk pengumuman ini.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}