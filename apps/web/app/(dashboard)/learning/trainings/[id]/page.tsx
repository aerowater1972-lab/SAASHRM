'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTraining, useCancelTraining } from '@/lib/hooks/benefits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, CalendarDays, Users, FileText, Tag, ShieldAlert } from 'lucide-react';

interface Participant { id: string; employeeId: string; fullName?: string; status: string; score?: number }

const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success', COMPLETED: 'secondary', CANCELLED: 'destructive', DRAFT: 'secondary',
};

const participantStatusVariant: Record<string, 'success' | 'warning' | 'secondary'> = {
  REGISTERED: 'secondary', ATTENDED: 'success', COMPLETED: 'success', CANCELLED: 'secondary',
};

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error, refetch } = useTraining(params.id as string);
  const cancelTraining = useCancelTraining();

  async function handleCancel() {
    if (!confirm('Batalkan training ini?')) return;
    try { await cancelTraining.mutateAsync(params.id as string); refetch(); }
    catch (e: any) { setActionError(e.message); }
  }

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error instanceof Error ? error.message : 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
          <p className="text-sm text-muted-foreground">Detail training</p>
        </div>
        <Badge variant={(statusVariant[data.status] || 'secondary') as any} className="ml-auto">{data.status}</Badge>
      </div>

      {actionError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Informasi Training</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3"><Tag className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm">{data.category ? <Badge variant={data.category === 'K3' ? 'success' : 'secondary'}>{data.category}</Badge> : <span className="text-muted-foreground">—</span>}</p></div></div>
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm font-medium">{data.type}</p></div></div>
            <div className="flex items-start gap-3"><CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm">{new Date(data.startDate).toLocaleDateString('id-ID')} – {new Date(data.endDate).toLocaleDateString('id-ID')}</p></div></div>
            {data.capacity && <div className="flex items-start gap-3"><Users className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm">Max: {data.capacity} peserta</p></div></div>}
            {data.recommendedViolationCategory && (
              <div className="flex items-start gap-3"><ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5" /><div><p className="text-sm">Rekomendasi untuk: <span className="font-medium">{data.recommendedViolationCategory.name}</span></p></div></div>
            )}
            {data.description && <p className="text-sm text-muted-foreground pt-2">{data.description}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Aksi</CardTitle></CardHeader>
          <CardContent>
            {data.status === 'ACTIVE' && (
              <Button variant="destructive" onClick={handleCancel}>Cancel Training</Button>
            )}
            {data.status !== 'ACTIVE' && (
              <p className="text-sm text-muted-foreground">Training ini sudah {data.status.toLowerCase()}.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Peserta ({data.participants?.length})</CardTitle></CardHeader>
        <CardContent>
          {!data.participants || data.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada peserta.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.participants?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.fullName || p.employeeId}</TableCell>
                      <TableCell><Badge variant={(participantStatusVariant[p.status] || 'secondary') as any}>{p.status}</Badge></TableCell>
                      <TableCell>{p.score != null ? Number(p.score).toFixed(1) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
