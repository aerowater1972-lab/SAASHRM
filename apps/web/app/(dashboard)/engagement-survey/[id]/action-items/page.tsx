'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  useEngagementSurvey,
  useEngagementSurveyActionItems,
  useCreateEngagementSurveyActionItem,
  useUpdateEngagementSurveyActionItem,
  useUpdateSurveyActionItemProgress,
  useDeleteSurveyActionItem,
  useSurveyActionItemSummary,
} from '@/lib/hooks/use-engagement-survey';
import { fetchUsers } from '@/lib/api/admin';
import { ActionItemSummaryCards, SurveyActionItemsList } from '@/components/engagement-survey/survey-action-items';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Plus } from 'lucide-react';

export default function EngagementSurveyActionItemsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: survey } = useEngagementSurvey(id);
  const { data: items, isLoading, error, refetch } = useEngagementSurveyActionItems(id);
  const { data: summary } = useSurveyActionItemSummary(id);
  const { data: users } = useQuery({
    queryKey: ['admin', 'users', 'picker'],
    queryFn: () => fetchUsers({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useCreateEngagementSurveyActionItem();
  const updateMutation = useUpdateEngagementSurveyActionItem();
  const progressMutation = useUpdateSurveyActionItemProgress();
  const deleteMutation = useDeleteSurveyActionItem();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [progress, setProgress] = useState('0');
  const [saving, setSaving] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;

  async function handleCreate() {
    if (!title.trim() || !assigneeId.trim() || !dueDate) {
      toast.error('Judul, owner, dan deadline wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({
        surveyId: id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId,
          dueDate: new Date(dueDate).toISOString(),
          progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        },
      });
      setShowForm(false);
      setTitle(''); setDescription(''); setAssigneeId(''); setDueDate(''); setProgress('0');
      toast.success('Action item dibuat.');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal membuat action item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(actionItemId: string, status: string) {
    try {
      await updateMutation.mutateAsync({
        actionItemId,
        data: { status, ...(status === 'COMPLETED' ? { progress: 100 } : {}) },
      });
    } catch { /* surfaced by react-query */ }
  }

  async function handleUpdateProgress(actionItemId: string, value: number) {
    try {
      await progressMutation.mutateAsync({ actionItemId, progress: value });
    } catch { /* surfaced by react-query */ }
  }

  async function handleDelete(actionItemId: string) {
    if (!window.confirm('Hapus action item ini?')) return;
    try {
      await deleteMutation.mutateAsync(actionItemId);
      toast.success('Action item dihapus.');
    } catch { /* surfaced by react-query */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Action Items</h1>
          <p className="text-sm text-muted-foreground">{survey?.title || '—'}</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> {showForm ? 'Batal' : 'Buat'}
        </Button>
      </div>

      <ActionItemSummaryCards summary={summary} />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Action Item Baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ai-title">Judul</Label>
              <Input id="ai-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul action item" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-desc">Deskripsi</Label>
              <Input id="ai-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi (opsional)" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ai-owner">Owner (Assignee)</Label>
                <select
                  id="ai-owner"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">— pilih user —</option>
                  {(users?.data ?? []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-due">Deadline</Label>
                <Input id="ai-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-progress">Progress awal (%)</Label>
                <Input id="ai-progress" type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Daftar Action Items ({items?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <SurveyActionItemsList
            items={items}
            canManage
            loading={isLoading}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProgress={handleUpdateProgress}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
