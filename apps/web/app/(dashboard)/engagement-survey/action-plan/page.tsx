'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useSurveyActionItems,
  useSurveyActionItemSummary,
  useUpdateSurveyActionItemProgress,
  useUpdateEngagementSurveyActionItem,
  useDeleteSurveyActionItem,
} from '@/lib/hooks/use-engagement-survey';
import { usePermission } from '@/lib/hooks/use-permission';
import { ActionItemSummaryCards, SurveyActionItemsList } from '@/components/engagement-survey/survey-action-items';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ListChecks } from 'lucide-react';

export default function SurveyActionPlanPage() {
  const router = useRouter();
  const { allowed: canManage } = usePermission('engagement_survey:manage_actions');

  const [status, setStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState('');

  const { data: list, isLoading, error, refetch } = useSurveyActionItems({
    status: status || undefined,
    overdueOnly: overdueOnly || undefined,
    mineOnly: mineOnly || undefined,
    search: search.trim() || undefined,
    limit: 50,
  });
  const { data: summary } = useSurveyActionItemSummary();

  const progressMutation = useUpdateSurveyActionItemProgress();
  const updateMutation = useUpdateEngagementSurveyActionItem();
  const deleteMutation = useDeleteSurveyActionItem();

  async function handleUpdateStatus(actionItemId: string, next: string) {
    try {
      await updateMutation.mutateAsync({
        actionItemId,
        data: { status: next, ...(next === 'COMPLETED' ? { progress: 100 } : {}) },
      });
    } catch { /* surfaced by react-query */ }
  }

  async function handleUpdateProgress(actionItemId: string, value: number) {
    try {
      await progressMutation.mutateAsync({ actionItemId, progress: value });
    } catch (e: any) {
      toast.error(e?.message || 'Hanya owner yang dapat mengubah progress action item ini.');
    }
  }

  async function handleDelete(actionItemId: string) {
    if (!window.confirm('Hapus action item ini?')) return;
    try {
      await deleteMutation.mutateAsync(actionItemId);
      toast.success('Action item dihapus.');
    } catch { /* surfaced by react-query */ }
  }

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Action Plan Survei</h1>
          <p className="text-sm text-muted-foreground">
            Tindak lanjut hasil engagement survey: owner, deadline, status &amp; progress
          </p>
        </div>
      </div>

      <ActionItemSummaryCards summary={summary} />

      <Card>
        <CardHeader><CardTitle className="text-sm">Filter</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="f-status">Status</Label>
            <select
              id="f-status"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Semua</option>
              <option value="PENDING">Belum mulai</option>
              <option value="IN_PROGRESS">Berjalan</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-search">Cari</Label>
            <Input id="f-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Judul / deskripsi" />
          </div>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
            Hanya yang terlambat
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Hanya milik saya
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Action Items ({list?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <SurveyActionItemsList
            items={list?.data}
            canManage={canManage}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProgress={handleUpdateProgress}
            onDelete={canManage ? handleDelete : undefined}
          />
          {list?.data?.length ? (
            <Button variant="link" className="mt-2 px-0" onClick={() => router.push('/engagement-survey')}>
              Lihat daftar survei →
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
