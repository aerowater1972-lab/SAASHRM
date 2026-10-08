'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Network, Trash2, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TableSkeleton, EmptyState } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import { useSuccessionSummary, useSuccessionPlans, useCreateSuccessionPlan, useDeleteSuccessionPlan, useUpdateSuccessionPlan } from '@/lib/hooks/use-succession';
import { useEmployees } from '@/lib/hooks/employees';
import { usePositions, useDepartments } from '@/lib/hooks/organization';
import type { SuccessionPlan, SuccessionPlanStatus } from '@/lib/api/succession';
import { planStatusLabels, planStatusVariant, riskLabels, riskVariant } from '@/lib/api/succession';

export default function SuccessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [positionId, setPositionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [currentEmployeeId, setCurrentEmployeeId] = useState('');
  const [riskCode, setRiskCode] = useState('MEDIUM');
  const [targetReadyDate, setTargetReadyDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: summary } = useSuccessionSummary();
  const { data: plans, isLoading, error } = useSuccessionPlans({ search: search || undefined, status: status || undefined });
  const { data: employees } = useEmployees({ limit: 100 } as any);
  const { data: positions } = usePositions();
  const { data: departments } = useDepartments();
  const createPlan = useCreateSuccessionPlan();
  const deletePlan = useDeleteSuccessionPlan();
  const updatePlan = useUpdateSuccessionPlan();
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!positionId) return;
    setSaving(true);
    try {
      await createPlan.mutateAsync({
        positionId,
        departmentId: departmentId || undefined,
        currentEmployeeId: currentEmployeeId || undefined,
        riskCode,
        targetReadyDate: targetReadyDate ? new Date(targetReadyDate).toISOString() : undefined,
        notes: notes || undefined,
      });
      toast('Rencana suksesi dibuat', 'success');
      setShowNew(false);
      setPositionId(''); setDepartmentId(''); setCurrentEmployeeId('');
      setRiskCode('MEDIUM'); setTargetReadyDate(''); setNotes('');
    } catch (e: any) {
      toast(e?.message ?? 'Gagal membuat rencana suksesi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activate = async (id: string) => {
    try {
      await updatePlan.mutateAsync({ id, data: { status: 'ACTIVE' } });
      toast('Rencana diaktifkan', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Gagal mengaktifkan', 'error');
    }
  };

  const statsCards = [
    { label: 'Total Rencana', value: summary?.totalPlans ?? 0 },
    { label: 'Aktif', value: summary?.activePlans ?? 0 },
    { label: 'Talent Pools', value: summary?.totalPools ?? 0 },
    { label: 'Kandidat', value: summary?.totalCandidates ?? 0 },
  ];

  const empOptions = employees?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Succession Plans</h1>
          <p className="text-sm text-muted-foreground">Perencanaan suksesi untuk posisi kritis</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Rencana Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Buat Rencana Suksesi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="planPos">Posisi</Label>
                <select id="planPos" value={positionId} onChange={(e) => setPositionId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Pilih posisi...</option>
                  {(positions ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planDept">Departemen</Label>
                  <select id="planDept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Otomatis dari posisi</option>
                    {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planHolder">Pemegang Saat Ini</Label>
                  <select id="planHolder" value={currentEmployeeId} onChange={(e) => setCurrentEmployeeId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Tidak ada / kosong</option>
                    {empOptions.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planRisk">Risiko</Label>
                  <select id="planRisk" value={riskCode} onChange={(e) => setRiskCode(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="LOW">Rendah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HIGH">Tinggi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planReady">Target Siap</Label>
                  <Input id="planReady" type="date" value={targetReadyDate} onChange={(e) => setTargetReadyDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="planNotes">Catatan</Label>
                <textarea id="planNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Catatan rencana suksesi..." />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Batal</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={saving || !positionId}>
                  Simpan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsCards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari posisi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Semua status</option>
          {Object.entries(planStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <div className="text-destructive">Gagal memuat rencana suksesi.</div>}
      {!isLoading && (!plans || plans.length === 0) && (
        <EmptyState title="Belum ada rencana suksesi" description="Buat rencana untuk posisi kritis yang perlu disiapkan penggantinya." action={{ label: 'Buat Rencana', onClick: () => setShowNew(true) }} />
      )}

      {!isLoading && plans && plans.length > 0 && (
        <Card>
          {plans.map((plan: SuccessionPlan) => (
            <div key={plan.id} className="border-b last:border-b-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <button className="flex-1 text-left" onClick={() => router.push(`/succession/${plan.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plan.position?.name ?? '—'}</span>
                    {plan.riskCode && <Badge variant={(riskVariant[plan.riskCode] as any) || 'secondary'}>{riskLabels[plan.riskCode] ?? plan.riskCode}</Badge>}
                    <Badge variant={(planStatusVariant[plan.status] as any) || 'secondary'}>{planStatusLabels[plan.status] ?? plan.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {plan.department?.name ?? '—'} · Pemegang: {plan.currentHolder?.fullName ?? 'Kosong'} · {plan._count?.candidates ?? 0} kandidat
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {plan.status === 'DRAFT' && (
                    <Button size="icon" aria-label="Aktifkan" variant="ghost" title="Aktifkan" onClick={() => activate(plan.id)}>
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" aria-label="Hapus" variant="ghost" title="Hapus" onClick={() => deletePlan.mutateAsync(plan.id).then(() => toast('Dihapus', 'success'))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}