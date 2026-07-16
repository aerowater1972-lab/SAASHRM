'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGoal, useUpdateGoalProgress } from '@/lib/hooks/performance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { ArrowLeft, Target } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  ACHIEVED: 'success',
  CANCELLED: 'destructive',
  NOT_STARTED: 'secondary',
};

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: goal, isLoading, error, refetch } = useGoal(params.id as string);
  const updateGoalProgress = useUpdateGoalProgress();
  const [progressInput, setProgressInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (goal) setProgressInput(String(g.actualValue ?? 0));
  }, [goal]);

  async function handleUpdateProgress() {
    setUpdating(true); setActionError('');
    try {
      await updateGoalProgress.mutateAsync({ id: params.id as string, actualValue: Number(progressInput) });
    } catch (e: any) { setActionError(e.message); }
    finally { setUpdating(false); }
  }

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!goal && !isLoading) return <EmptyState title="Goal tidak ditemukan" description="Data goal tidak tersedia." />;
  const g = goal as any;

  const pct = g.targetValue && g.targetValue > 0
    ? Math.min(100, Math.round(((g.actualValue || 0) / g.targetValue) * 100)) : 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      {actionError && <div className="text-destructive text-sm">{actionError}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{g.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{g.employee?.fullName} · {g.employee?.employeeId}</p>
                </div>
              </div>
              <Badge variant={(statusVariant[g.status] || 'secondary') as any}>{g.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Metrik</p>
                <p className="font-medium">{g.metric || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="font-medium">{g.targetValue ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktual</p>
                <p className="font-medium">{g.actualValue ?? 0}</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{g.actualValue ?? 0} / {g.targetValue ?? '—'} ({pct}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3 items-end pt-2 border-t">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Update Progress</label>
                <Input type="number" min={0} value={progressInput} onChange={(e) => setProgressInput(e.target.value)} />
              </div>
              <Button onClick={handleUpdateProgress} disabled={updating}>
                {updating ? 'Menyimpan…' : 'Update'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Periode</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mulai</span>
              <span>{g.startDate ? new Date(g.startDate).toLocaleDateString('id-ID') : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selesai</span>
              <span>{g.endDate ? new Date(g.endDate).toLocaleDateString('id-ID') : '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
