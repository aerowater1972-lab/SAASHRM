'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasPermission } from '@/lib/api';
import { useLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest, useCancelLeaveRequest, useEscalateLeaveRequest } from '@/lib/hooks/leave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, CalendarDays, User, FileText } from 'lucide-react';

interface LeaveDetail {
  id: string;
  leaveType: { id: string; name: string; code: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  isUrgent?: boolean;
  escalated?: boolean;
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  employee: { employeeId: string; fullName: string; email: string };
}

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
};

export default function LeaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { data: request, isLoading, error, refetch } = useLeaveRequest(id);
  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();
  const cancelLeave = useCancelLeaveRequest();
  const escalateLeave = useEscalateLeaveRequest();
  const [actioning, setActioning] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState('');

  const canApprove = hasPermission('leave-requests:approve');
  const isPending = request?.status === 'PENDING';
  const errMsg = (error instanceof Error ? error.message : '') || actionError;

  if (isLoading) return <PageSkeleton />;
  if (error || !request) return <ErrorState message={errMsg || 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  async function handleApprove() {
    setActioning(true); setActionError('');
    try {
      await approveLeave.mutateAsync(id);
      setNotes('');
      refetch();
    } catch (e: any) { setActionError(e.message); }
    finally { setActioning(false); }
  }

  async function handleReject() {
    if (!notes.trim()) { setActionError('Alasan wajib diisi untuk menolak'); return; }
    setActioning(true); setActionError('');
    try {
      await rejectLeave.mutateAsync({ id, reason: notes });
      setNotes('');
      refetch();
    } catch (e: any) { setActionError(e.message); }
    finally { setActioning(false); }
  }

  async function handleCancel() {
    if (!confirm('Batalkan pengajuan cuti ini?')) return;
    setActioning(true); setActionError('');
    try {
      await cancelLeave.mutateAsync(id);
      refetch();
    } catch (e: any) { setActionError(e.message); }
    finally { setActioning(false); }
  }

  async function handleEscalate() {
    setActioning(true); setActionError('');
    try {
      await escalateLeave.mutateAsync(id);
      refetch();
    } catch (e: any) { setActionError(e.message); }
    finally { setActioning(false); }
  }

  const needsEscalation = isPending && request?.isUrgent && !request?.escalated;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{request.leaveType?.name}</h1>
          <p className="text-sm text-muted-foreground">Detail pengajuan cuti</p>
        </div>
        <Badge variant={(statusVariant[request.status] || 'secondary') as any} className="ml-auto">{request.status}</Badge>
      </div>

      {errMsg && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errMsg}</div>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Informasi Cuti</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{request.employee?.fullName}</p>
                <p className="text-xs text-muted-foreground">{request.employee?.employeeId} &middot; {request.employee?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{new Date(request.startDate).toLocaleDateString('id-ID')} – {new Date(request.endDate).toLocaleDateString('id-ID')}</p>
                <p className="text-xs text-muted-foreground">{request.totalDays} hari</p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Alasan</p>
              <p className="text-sm text-muted-foreground">{request.reason || '—'}</p>
            </div>
          </div>
          {request.approvedBy && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Disetujui oleh</p>
                  <p className="text-sm text-muted-foreground">{request.approvedBy}{request.approvedAt ? ` pada ${new Date(request.approvedAt).toLocaleString('id-ID')}` : ''}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isPending && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Aksi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(canApprove) && (
              <>
                {needsEscalation && (
                  <div className="rounded-md bg-orange-500/10 p-3 text-sm">
                    <p className="font-medium">Pengajuan mendesak (H-1/hari-H) — wajib dieskalasi sebelum dapat disetujui (BR-04).</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleEscalate} disabled={actioning}>
                      {actioning ? 'Memproses…' : 'Eskalasi ke Atasan'}
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Catatan / Alasan</Label>
                  <textarea aria-label="Catatan / Alasan"
                    rows={2} value={notes}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan untuk approve/reject"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApprove} disabled={actioning}>{actioning ? 'Memproses…' : 'Setujui'}</Button>
                  <Button variant="destructive" onClick={handleReject} disabled={actioning}>{actioning ? 'Memproses…' : 'Tolak'}</Button>
                </div>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={actioning}>Batalkan Pengajuan</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
