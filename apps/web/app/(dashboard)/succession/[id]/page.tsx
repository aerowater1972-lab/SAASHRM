'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TableSkeleton, EmptyState } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import { useSuccessionPlan, useUpdateSuccessionPlan, useAddSuccessionCandidate, useRemoveSuccessionCandidate, useUpdateSuccessionCandidate } from '@/lib/hooks/use-succession';
import { useEmployees } from '@/lib/hooks/employees';
import type { TalentReadiness } from '@/lib/api/succession';
import { readinessLabels, readinessVariant, planStatusLabels, planStatusVariant, riskLabels, riskVariant } from '@/lib/api/succession';

export default function SuccessionPlanDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const { data: plan, isLoading, error } = useSuccessionPlan(id);
  const updatePlan = useUpdateSuccessionPlan();
  const addCandidate = useAddSuccessionCandidate();
  const removeCandidate = useRemoveSuccessionCandidate();
  const updateCandidate = useUpdateSuccessionCandidate();
  const { data: employees } = useEmployees({ limit: 100 } as any);

  const [showAdd, setShowAdd] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [readiness, setReadiness] = useState<TalentReadiness>('DEVELOPING');
  const [rank, setRank] = useState(1);
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const candidates = plan?.candidates ?? [];

  const changeStatus = async (status: string) => {
    try {
      await updatePlan.mutateAsync({ id, data: { status } });
      toast(`Status: ${planStatusLabels[status as keyof typeof planStatusLabels] ?? status}`, 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Gagal mengubah status', 'error');
    }
  };

  const handleAdd = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      await addCandidate.mutateAsync({ planId: id, data: { employeeId, readiness, rank, assessmentNotes: assessmentNotes || undefined } });
      toast('Kandidat ditambahkan', 'success');
      setShowAdd(false);
      setEmployeeId(''); setReadiness('DEVELOPING'); setRank(1); setAssessmentNotes('');
    } catch (e: any) {
      toast(e?.message ?? 'Gagal menambah kandidat', 'error');
    } finally {
      setSaving(false);
    }
  };

  const rankCandidate = async (candidateId: string, newRank: number) => {
    try {
      await updateCandidate.mutateAsync({ planId: id, candidateId, data: { rank: newRank } });
    } catch (e: any) {
      toast(e?.message ?? 'Gagal mengubah peringkat', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" aria-label="Kembali" variant="ghost" onClick={() => router.push('/succession')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{plan?.position?.name ?? 'Rencana Suksesi'}</h1>
          <p className="text-sm text-muted-foreground">{plan?.department?.name ?? ''} · Dibuat oleh {plan?.createdBy?.fullName ?? '—'}</p>
        </div>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <div className="text-destructive">Gagal memuat rencana.</div>}

      {!isLoading && plan && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={(planStatusVariant[plan.status] as any) || 'secondary'} className="mt-1">{planStatusLabels[plan.status] ?? plan.status}</Badge>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Risiko</div>
              {plan.riskCode ? <Badge variant={(riskVariant[plan.riskCode] as any) || 'secondary'} className="mt-1">{riskLabels[plan.riskCode] ?? plan.riskCode}</Badge> : <div className="mt-1 text-lg">—</div>}
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Pemegang Saat Ini</div>
              <div className="mt-1 font-medium">{plan.currentHolder?.fullName ?? 'Kosong'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Target Siap</div>
              <div className="mt-1 font-medium">{plan.targetReadyDate ? new Date(plan.targetReadyDate).toLocaleDateString() : '—'}</div>
            </Card>
          </div>

          {plan.notes && (
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Catatan</div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{plan.notes}</p>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Kandidat Suksesi</h2>
              <p className="text-sm text-muted-foreground">{candidates.length} kandidat untuk posisi ini</p>
            </div>
            <div className="flex items-center gap-2">
              {plan.status !== 'ACTIVE' && (
                <Button variant="outline" onClick={() => changeStatus('ACTIVE')}>Aktifkan</Button>
              )}
              {plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
                <Dialog open={showAdd} onOpenChange={setShowAdd}>
                  <DialogTrigger asChild>
                    <Button><Plus className="mr-2 h-4 w-4" /> Tambah Kandidat</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Tambah Kandidat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="candEmp">Karyawan</Label>
                        <select id="candEmp" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Pilih karyawan...</option>
                          {(employees?.data ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="candReadiness">Kesiapan</Label>
                          <select id="candReadiness" value={readiness} onChange={(e) => setReadiness(e.target.value as TalentReadiness)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            {Object.entries(readinessLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="candRank">Peringkat</Label>
                          <Input id="candRank" type="number" min={1} value={rank} onChange={(e) => setRank(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="candNotes">Catatan Assessment</Label>
                        <textarea id="candNotes" value={assessmentNotes} onChange={(e) => setAssessmentNotes(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Hasil assessment..." />
                      </div>
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="outline">Batal</Button>
                        </DialogClose>
                        <Button onClick={handleAdd} disabled={saving || !employeeId}>Simpan</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {candidates.length === 0 ? (
            <EmptyState title="Belum ada kandidat" description="Tambahkan kandidat yang siap menggantikan posisi ini." action={{ label: 'Tambah Kandidat', onClick: () => setShowAdd(true) }} />
          ) : (
            <Card>
              {candidates.map((c) => (
                <div key={c.id} className="border-b last:border-b-0 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.employee?.fullName ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">{c.employee?.employeeId ?? ''}</span>
                        <Badge variant={(readinessVariant[c.readiness] as any) || 'secondary'}>{readinessLabels[c.readiness] ?? c.readiness}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Peringkat #{c.rank} · {c.decision === 'PROMOTED' ? 'Diajukan Promosi' : c.decision === 'NOT_SELECTED' ? 'Tidak Dipilih' : 'Pending'}
                        {c.assessmentNotes ? ` · ${c.assessmentNotes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.rank > 1 && (
                        <Button size="icon" variant="ghost" title="Naikkan peringkat" onClick={() => rankCandidate(c.id, c.rank - 1)}>↑</Button>
                      )}
                      <Button size="icon" variant="ghost" title="Turunkan" onClick={() => rankCandidate(c.id, c.rank + 1)}>↓</Button>
                      <Button size="icon" aria-label="Hapus" variant="ghost" title="Hapus" onClick={() => removeCandidate.mutateAsync({ planId: id, candidateId: c.id }).then(() => toast('Kandidat dihapus', 'success'))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          <div className="flex items-center gap-2">
            {plan.status === 'ACTIVE' && (
              <Button variant="outline" onClick={() => changeStatus('COMPLETED')}>Tandai Selesai</Button>
            )}
            {plan.status === 'ACTIVE' && (
              <Button variant="ghost" onClick={() => changeStatus('CANCELLED')}>Batalkan Rencana</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}