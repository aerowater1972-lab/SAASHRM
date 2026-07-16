'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useResignation,
  useCreateFinalSettlement,
  useApproveResignation,
  useRejectResignation,
  useOffboardResignation,
  useUpdateResignationTask,
} from '@/lib/hooks/benefits';
import { fetchFinalSettlement } from '@/lib/api/benefits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, User, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
  COMPLETED: 'success',
  AWAITING_HR: 'warning',
  AWAITING_MANAGER: 'warning',
};

export default function ResignationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: req, isLoading, error, refetch } = useResignation(params.id as string);
  const createFinalSettlement = useCreateFinalSettlement();
  const approveResignation = useApproveResignation();
  const rejectResignation = useRejectResignation();
  const offboardResignation = useOffboardResignation();
  const updateResignationTask = useUpdateResignationTask();

  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlement, setSettlement] = useState<any>(null);
  const [settlementForm, setSettlementForm] = useState({ unusedLeavePayout: 0, severanceAmount: 0, loanDeduction: 0, netPayout: 0 });
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadSettlement = () => {
    fetchFinalSettlement(params.id as string)
      .then((s: any) => { setSettlement(s); if (s) setSettlementForm({ unusedLeavePayout: Number(s.unusedLeavePayout), severanceAmount: Number(s.severanceAmount), loanDeduction: Number(s.loanDeduction), netPayout: Number(s.netPayout) }); })
      .catch(() => {});
  };

  useEffect(() => { loadSettlement(); }, [params.id]);

  const handleSaveSettlement = async () => {
    setSettlementLoading(true);
    try { const s = await createFinalSettlement.mutateAsync({ id: params.id as string, data: settlementForm }); setSettlement(s); setShowSettlementForm(false); }
    catch (e: any) { setActionError(e.message); } finally { setSettlementLoading(false); }
  };

  async function handleApprove() {
    setActionError('');
    try { await approveResignation.mutateAsync(params.id as string); }
    catch (e: any) { setActionError(e.message); }
  }

  async function handleReject() {
    const reason = prompt('Alasan penolakan:');
    if (!reason) return;
    setActionError('');
    try { await rejectResignation.mutateAsync({ id: params.id as string, reason }); }
    catch (e: any) { setActionError(e.message); }
  }

  async function handleOffboard() {
    if (!confirm('Jalankan offboarding? Karyawan akan dinonaktifkan dan aset dikembalikan.')) return;
    setActionLoading(true); setActionError('');
    try { await offboardResignation.mutateAsync(params.id as string); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleCompleteTask(taskId: string) {
    setActionError('');
    try { await updateResignationTask.mutateAsync({ id: params.id as string, taskId }); }
    catch (e: any) { setActionError(e.message); }
  }

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!req) return <p className="text-muted-foreground">Pengajuan tidak ditemukan</p>;
  const r = req as any;

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
                <User className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{r.employee?.fullName}</CardTitle>
                  <p className="text-xs text-muted-foreground">{r.employee?.employeeId} · {r.employee?.email}</p>
                </div>
              </div>
              <Badge variant={(statusVariant[r.status] || 'secondary') as any}>{r.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipe</span>
              <span className="font-medium">{r.type?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alasan</span>
              <span className="text-right max-w-[60%]">{r.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanggal Resign</span>
              <span>{new Date(r.resignationDate).toLocaleDateString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanggal Efektif</span>
              <span>{new Date(r.effectiveDate).toLocaleDateString('id-ID')}</span>
            </div>
            {r.rejectedReason && (
              <div className="text-destructive text-xs">
                Alasan ditolak: {r.rejectedReason}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {r.status === 'PENDING' && (
            <Card>
              <CardContent className="p-3 flex gap-2">
                <Button className="flex-1" onClick={handleApprove}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Setujui
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleReject}>
                  <XCircle className="mr-2 h-4 w-4" /> Tolak
                </Button>
              </CardContent>
            </Card>
          )}

          {r.status === 'APPROVED' && (
            <Card>
              <CardContent className="p-3">
                <Button className="w-full" onClick={handleOffboard} disabled={actionLoading}>
                  {actionLoading ? 'Memproses…' : '▶ Jalankan Offboarding'}
                </Button>
              </CardContent>
            </Card>
          )}

          {r.exitInterview && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Exit Interview</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p>{r.exitInterview.reason}</p>
                {r.exitInterview.feedback && <p className="text-muted-foreground">Feedback: {r.exitInterview.feedback}</p>}
                {r.exitInterview.areasForImprovement && <p className="text-muted-foreground">Improvements: {r.exitInterview.areasForImprovement}</p>}
                <p className="text-muted-foreground">Rekomendasi: {r.exitInterview.wouldRecommend ? 'Ya' : 'Tidak'} · {new Date(r.exitInterview.conductedAt).toLocaleDateString('id-ID')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Tugas Offboarding ({r.offboardingTasks?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!r.offboardingTasks || r.offboardingTasks.length === 0) ? (
            <p className="text-sm text-muted-foreground">Belum ada tugas offboarding.</p>
          ) : (
            <div className="divide-y">
              {r.offboardingTasks.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium">{t.taskName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{t.category} · {t.assignedTo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === 'COMPLETED' ? 'success' : 'warning'} className="text-[10px]">{t.status}</Badge>
                    {t.status === 'PENDING' && (
                      <Button size="sm" variant="outline" onClick={() => handleCompleteTask(t.id)} disabled={actionLoading}>
                        Selesaikan
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {r.status === 'APPROVED' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Final Settlement</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowSettlementForm(!showSettlementForm)}>
                {showSettlementForm ? 'Batal' : settlement ? 'Edit' : 'Buat'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {settlement && !showSettlementForm && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Payout Cuti</p>
                  <p className="font-medium">Rp {Number(settlement.unusedLeavePayout).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pesangon</p>
                  <p className="font-medium">Rp {Number(settlement.severanceAmount).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Potongan Pinjaman</p>
                  <p className="font-medium text-destructive">-Rp {Number(settlement.loanDeduction).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Dibayarkan</p>
                  <p className="font-semibold text-green-600">Rp {Number(settlement.netPayout).toLocaleString('id-ID')}</p>
                </div>
                <div className="col-span-2">
                  <Badge>{settlement.status}</Badge>
                </div>
              </div>
            )}

            {showSettlementForm && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Payout Cuti</Label>
                  <Input type="number" value={settlementForm.unusedLeavePayout} onChange={(e) => setSettlementForm({ ...settlementForm, unusedLeavePayout: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Pesangon</Label>
                  <Input type="number" value={settlementForm.severanceAmount} onChange={(e) => setSettlementForm({ ...settlementForm, severanceAmount: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Potongan Pinjaman</Label>
                  <Input type="number" value={settlementForm.loanDeduction} onChange={(e) => setSettlementForm({ ...settlementForm, loanDeduction: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Total Dibayarkan</Label>
                  <Input type="number" value={settlementForm.netPayout} onChange={(e) => setSettlementForm({ ...settlementForm, netPayout: +e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Button onClick={handleSaveSettlement} disabled={settlementLoading} className="w-full">
                    {settlementLoading ? 'Menyimpan…' : 'Simpan Settlement'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
