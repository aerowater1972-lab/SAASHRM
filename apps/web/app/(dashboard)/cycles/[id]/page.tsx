'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCycle, useStartCycle, useCompleteCycle } from '@/lib/hooks/performance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Play, CheckCircle2, Users } from 'lucide-react';

interface Cycle {
  id: string; name: string; period?: string; status: string;
  startDate?: string; endDate?: string; description?: string; createdAt: string;
  reviews: { id: string; status: string; employee: { id: string; fullName: string } }[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary'> = {
  COMPLETED: 'success', IN_PROGRESS: 'info', UPCOMING: 'warning', DRAFT: 'secondary',
};

export default function CycleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: cycle, isLoading, error, refetch } = useCycle(params.id as string);
  const startCycle = useStartCycle();
  const completeCycle = useCompleteCycle();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const errMsg = (error instanceof Error ? error.message : '') || actionError;

  if (isLoading) return <PageSkeleton />;
  if (error || !cycle) return <ErrorState message={errMsg || 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  async function handleStart() {
    setActionLoading(true); setActionError('');
    try { await startCycle.mutateAsync(params.id as string); refetch(); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleComplete() {
    setActionLoading(true); setActionError('');
    try { await completeCycle.mutateAsync(params.id as string); refetch(); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{cycle.name}</h1>
          <p className="text-sm text-muted-foreground">{cycle.description || ''}{cycle.period ? ` · ${cycle.period}` : ''}</p>
        </div>
        <Badge variant={(statusVariant[cycle.status] || 'secondary') as any} className="ml-auto">{cycle.status}</Badge>
      </div>

      {errMsg && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errMsg}</div>}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{cycle.reviews?.length || 0} reviews</p>
              {cycle.startDate && <p className="text-xs text-muted-foreground mt-1">{new Date(cycle.startDate).toLocaleDateString('id-ID')} – {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString('id-ID') : 'ongoing'}</p>}
            </div>
            <div className="flex gap-2">
              {cycle.status === 'UPCOMING' && (
                <Button onClick={handleStart} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                  <Play className="mr-2 h-4 w-4" />{actionLoading ? '…' : 'Start Cycle'}
                </Button>
              )}
              {cycle.status === 'IN_PROGRESS' && (
                <Button onClick={handleComplete} disabled={actionLoading}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />{actionLoading ? '…' : 'Complete Cycle'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Reviews ({cycle.reviews?.length || 0})</h3>
        {(!cycle.reviews || cycle.reviews.length === 0) && <p className="text-sm text-muted-foreground">Belum ada review.</p>}
        {cycle.reviews?.map((r: any) => (
          <Card key={r.id} className="mb-2">
            <CardContent className="p-4 flex justify-between items-center text-sm">
              <span className="font-medium">{r.employee.fullName}</span>
              <Badge variant={(statusVariant[r.status] || 'secondary') as any}>{r.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
