'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TableSkeleton, EmptyState } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import { useTalentPool, useAddPoolMember, useRemovePoolMember } from '@/lib/hooks/use-succession';
import { useEmployees } from '@/lib/hooks/employees';
import type { TalentReadiness } from '@/lib/api/succession';
import { readinessLabels, readinessVariant } from '@/lib/api/succession';

export default function TalentPoolDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const { data: pool, isLoading, error } = useTalentPool(id);
  const addMember = useAddPoolMember();
  const removeMember = useRemovePoolMember();
  const { data: employees } = useEmployees({ limit: 100 } as any);

  const [showAdd, setShowAdd] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [performanceBand, setPerformanceBand] = useState('MID');
  const [potentialBand, setPotentialBand] = useState('MID');
  const [readiness, setReadiness] = useState<TalentReadiness>('DEVELOPING');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const members = pool?.members ?? [];

  const handleAdd = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      await addMember.mutateAsync({ poolId: id, data: { employeeId, performanceBand, potentialBand, readiness, notes: notes || undefined } });
      toast('Anggota ditambahkan', 'success');
      setShowAdd(false);
      setEmployeeId(''); setPerformanceBand('MID'); setPotentialBand('MID'); setReadiness('DEVELOPING'); setNotes('');
    } catch (e: any) {
      toast(e?.message ?? 'Gagal menambah anggota', 'error');
    } finally {
      setSaving(false);
    }
  };

  const bandBadge = (band: string | null) => {
    if (!band) return null;
    const variant = band === 'HIGH' ? 'success' : band === 'LOW' ? 'destructive' : 'warning';
    return <Badge variant={variant as any}>{band} {band === 'HIGH' ? 'Kinerja/Potensi' : ''}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" aria-label="Kembali" variant="ghost" onClick={() => router.push('/succession/talent-pools')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pool?.name ?? 'Talent Pool'}</h1>
          <p className="text-sm text-muted-foreground">{pool?.description ?? ''}</p>
        </div>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <div className="text-destructive">Gagal memuat talent pool.</div>}

      {!isLoading && pool && (
        <>
          {pool.criteria && (
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Kriteria Seleksi</div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{pool.criteria}</p>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Anggota Pool</h2>
              <p className="text-sm text-muted-foreground">{members.length} anggota</p>
            </div>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Tambah Anggota
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Tambah Anggota ke Pool</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="mEmp">Karyawan</Label>
                    <select id="mEmp" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Pilih karyawan...</option>
                      {(employees?.data ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kinerja</Label>
                      <select value={performanceBand} onChange={(e) => setPerformanceBand(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="HIGH">High</option>
                        <option value="MID">Mid</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Potensi</Label>
                      <select value={potentialBand} onChange={(e) => setPotentialBand(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="HIGH">High</option>
                        <option value="MID">Mid</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mReadiness">Kesiapan</Label>
                    <select id="mReadiness" value={readiness} onChange={(e) => setReadiness(e.target.value as TalentReadiness)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {Object.entries(readinessLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mNotes">Catatan</Label>
                    <textarea aria-label="Catatan" id="mNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Catatan pengembangan..." />
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
          </div>

          {members.length === 0 ? (
            <EmptyState title="Belum ada anggota" description="Tambahkan karyawan ke dalam pool ini." action={{ label: 'Tambah Anggota', onClick: () => setShowAdd(true) }} />
          ) : (
            <Card>
              {members.map((m) => (
                <div key={m.id} className="border-b last:border-b-0 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.employee?.fullName ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">{m.employee?.employeeId ?? ''}</span>
                        <Badge variant={(readinessVariant[m.readiness] as any) || 'secondary'}>{readinessLabels[m.readiness] ?? m.readiness}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={m.performanceBand === 'HIGH' ? 'success' : m.performanceBand === 'LOW' ? 'destructive' : 'warning'} className="text-xs">Kin: {m.performanceBand ?? '—'}</Badge>
                        <Badge variant={m.potentialBand === 'HIGH' ? 'success' : m.potentialBand === 'LOW' ? 'destructive' : 'warning'} className="text-xs">Pot: {m.potentialBand ?? '—'}</Badge>
                      </div>
                      {m.notes && <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>}
                    </div>
                    <Button size="icon" aria-label="Hapus" variant="ghost" title="Hapus" onClick={() => removeMember.mutateAsync({ poolId: id, employeeId: m.employeeId }).then(() => toast('Anggota dihapus', 'success'))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}