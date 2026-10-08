'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEngagementSurvey, useEngagementSurveyActionItems, useCreateEngagementSurveyActionItem, useUpdateEngagementSurveyActionItem } from '@/lib/hooks/use-engagement-survey';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { ArrowLeft, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';

const actionStatusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

export default function EngagementSurveyActionItemsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: survey } = useEngagementSurvey(id);
  const { data: items, isLoading, error, refetch } = useEngagementSurveyActionItems(id);
  const createMutation = useCreateEngagementSurveyActionItem();
  const updateMutation = useUpdateEngagementSurveyActionItem();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;

  const actionItems = items ?? [];

  async function handleCreate() {
    setActionError('');
    if (!title.trim() || !assigneeId.trim() || !dueDate) {
      setActionError('Judul, assignee, dan due date harus diisi.');
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({ surveyId: id, data: { title, description, assigneeId, dueDate: new Date(dueDate).toISOString() } });
      setShowForm(false);
      setTitle(''); setDescription(''); setAssigneeId(''); setDueDate('');
    } catch (e: any) { setActionError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdateStatus(actionItemId: string, status: string) {
    try {
      await updateMutation.mutateAsync({ actionItemId, data: { status } });
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Action Items</h1>
          <p className="text-sm text-muted-foreground">{survey?.title || '—'}</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> {showForm ? 'Batal' : 'Buat'}
        </Button>
      </div>

      {actionError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</div>}

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Action Item Baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul action item" />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi (opsional)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Assignee ID</Label>
                <Input value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="User ID" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Daftar Action Items ({actionItems.length})</CardTitle></CardHeader>
        <CardContent>
          {actionItems.length === 0 ? (
            <EmptyState description="Belum ada action item. Klik tombol Buat untuk menambahkan." />
          ) : (
            <div className="divide-y">
              {actionItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Assignee: {item.assigneeId}</span>
                      <span>Due: {new Date(item.dueDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={actionStatusVariant[item.status] || 'secondary'}>{item.status}</Badge>
                    {item.status === 'PENDING' && (
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(item.id, 'IN_PROGRESS')} title="Mulai"><Clock className="h-4 w-4" /></Button>
                    )}
                    {(item.status === 'PENDING' || item.status === 'IN_PROGRESS') && (
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(item.id, 'COMPLETED')} title="Selesai"><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                    )}
                    {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(item.id, 'CANCELLED')} title="Batal"><XCircle className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
