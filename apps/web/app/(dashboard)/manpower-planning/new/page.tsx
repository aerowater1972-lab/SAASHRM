'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useManpowerPlan, useCreateManpowerPlan, useUpdateManpowerPlan } from '@/lib/hooks/use-manpower-planning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/data-states';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface PlanItem {
  positionTitle: string;
  gradeId?: string;
  quantity: number;
  type: string;
  estimatedCost?: number;
}

const emptyItem = (): PlanItem => ({
  positionTitle: '',
  gradeId: '',
  quantity: 1,
  type: 'NEW',
  estimatedCost: 0,
});

export default function ManpowerPlanFormPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManpowerPlanFormContent />
    </Suspense>
  );
}

function ManpowerPlanFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const { data: existing, isLoading: loadingExisting } = useManpowerPlan(editId || '');
  const createMutation = useCreateManpowerPlan();
  const updateMutation = useUpdateManpowerPlan(editId || '');

  const [departmentId, setDepartmentId] = useState('');
  const [period, setPeriod] = useState('');
  const [items, setItems] = useState<PlanItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setDepartmentId(existing.departmentId);
      setPeriod(existing.period);
      if (existing.items && existing.items.length > 0) {
        setItems(existing.items.map((i: any) => ({
          positionTitle: i.positionTitle,
          gradeId: i.gradeId || '',
          quantity: i.quantity,
          type: i.type,
          estimatedCost: i.estimatedCost || 0,
        })));
      }
    }
  }, [existing]);

  function addItem() { setItems([...items, emptyItem()]); }
  function removeItem(idx: number) { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); }

  function updateItem(idx: number, field: keyof PlanItem, value: any) {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  }

  async function handleSave() {
    setError('');
    if (!departmentId || !period) { setError('Departemen dan periode harus diisi.'); return; }
    if (items.some((i) => !i.positionTitle.trim())) { setError('Semua posisi harus memiliki judul.'); return; }

    setSaving(true);
    try {
      const payload: any = {
        departmentId,
        period,
        items: items.map((i) => ({
          positionTitle: i.positionTitle,
          ...(i.gradeId ? { gradeId: i.gradeId } : {}),
          quantity: i.quantity,
          type: i.type,
          ...(i.estimatedCost ? { estimatedCost: i.estimatedCost } : {}),
        })),
      };

      if (editId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      router.push('/manpower-planning');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (editId && loadingExisting) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">{editId ? 'Edit Rencana' : 'Rencana Baru'}</h1>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-sm">Informasi Rencana</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department ID</Label>
              <Input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} placeholder="Department ID" />
            </div>
            <div className="space-y-2">
              <Label>Periode</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Contoh: 2026-H1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Posisi ({items.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Posisi #{idx + 1}</span>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Judul Posisi</Label>
                  <Input value={item.positionTitle} onChange={(e) => updateItem(idx, 'positionTitle', e.target.value)} placeholder="Nama posisi" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Grade ID</Label>
                  <Input value={item.gradeId || ''} onChange={(e) => updateItem(idx, 'gradeId', e.target.value)} placeholder="Grade (opsional)" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Jumlah</Label>
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Tipe</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.type} onChange={(e) => updateItem(idx, 'type', e.target.value)}>
                    <option value="NEW">New</option>
                    <option value="REPLACEMENT">Replacement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Estimasi Biaya</Label>
                  <Input type="number" min={0} value={item.estimatedCost || 0} onChange={(e) => updateItem(idx, 'estimatedCost', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Batal</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan…' : editId ? 'Simpan Perubahan' : 'Buat Rencana'}</Button>
      </div>
    </div>
  );
}
