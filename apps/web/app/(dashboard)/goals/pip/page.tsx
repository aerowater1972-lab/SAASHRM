'use client';

import { useState } from 'react';
import { usePipStatus, useStartPip, useUpdateGoalProgress } from '@/lib/hooks/performance';
import { EmployeeSearch } from '@/components/employee-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { hasPermission } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Plus, Trash2, Target } from 'lucide-react';

interface PipGoalRow { title: string; metric: string; targetValue: string }

const emptyRow = (): PipGoalRow => ({ title: '', metric: '', targetValue: '' });

function daysLeft(end?: string): number | null {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
}

export default function PipPage() {
  const [empId, setEmpId] = useState('');
  const { data: raw, isLoading, error, refetch } = usePipStatus(empId);
  const st = raw as any;
  const startMutation = useStartPip();
  const progressMutation = useUpdateGoalProgress();
  const canProgress = hasPermission('performance:goal:progress');
  const canStart = hasPermission('performance:goal:create');
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState<PipGoalRow[]>([emptyRow()]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(Date.now() + 90 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [err, setErr] = useState('');

  async function handleStart() {
    const goals = rows
      .filter((r) => r.title.trim())
      .map((r) => ({
        title: r.title.trim(),
        metric: r.metric.trim() || undefined,
        targetValue: r.targetValue ? Number(r.targetValue) : undefined,
      }));
    if (goals.length === 0) { setErr('Minimal 1 target terukur'); return; }
    setErr('');
    try {
      await startMutation.mutateAsync({ employeeId: empId, data: { goals, endDate } });
      setDialogOpen(false); setRows([emptyRow()]); refetch();
      toast('PIP 90 hari dimulai', 'success');
    } catch (e: any) { setErr(e.message); toast(e.message, 'error'); }
  }

  const left = daysLeft(st?.pipEndDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Improvement Plan</h1>
          <p className="text-sm text-muted-foreground">Target terukur 90 hari — lulus bila semua tercapai</p>
        </div>
        {empId && canStart && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Mulai PIP</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>PIP baru</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-6"><Label>Target {i + 1}</Label><Input value={r.title} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="cth. Kehadiran ≥ 95%" /></div>
                    <div className="col-span-6 sm:col-span-3"><Label>Metrik</Label><Input value={r.metric} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, metric: e.target.value } : x))} placeholder="%" /></div>
                    <div className="col-span-5 sm:col-span-2"><Label>Nilai</Label><Input type="number" min="0" value={r.targetValue} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, targetValue: e.target.value } : x))} /></div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" disabled={rows.length <= 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setRows([...rows, emptyRow()])}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah target
                </Button>
                <div><Label>Batas akhir</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                {err && <p className="text-sm text-red-600">{err}</p>}
                <Button onClick={handleStart} disabled={startMutation.isPending}>Mulai</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="max-w-xl">
        <EmployeeSearch value={empId} onChange={(id) => setEmpId(id)} />
      </div>

      {!empId && <EmptyState title="Pilih karyawan" description="Pilih karyawan untuk melihat atau memulai PIP." />}
      {empId && isLoading && <TableSkeleton rows={3} columns={2} />}
      {empId && error && <ErrorState message="Gagal memuat status PIP" onRetry={() => refetch()} />}
      {empId && !isLoading && !error && !st?.active && (st?.total ?? 0) === 0 && (
        <EmptyState title="Belum pernah PIP" description="Karyawan ini belum memiliki riwayat PIP. Mulai PIP bila diperlukan." />
      )}

      {empId && st && (st.active || (st.total ?? 0) > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" /> Status PIP
              </CardTitle>
              <div className="flex gap-2 items-center">
                {st.passed
                  ? <Badge variant="success">LULUS</Badge>
                  : st.active
                    ? <Badge variant="warning">BERJALAN</Badge>
                    : <Badge variant="secondary">SELESAI</Badge>}
                {left !== null && st.active && left >= 0 && (
                  <span className="text-xs text-muted-foreground">Sisa {left} hari</span>
                )}
                {left !== null && st.active && left < 0 && (
                  <span className="text-xs text-destructive font-medium">Terlambat {-left} hari — putuskan: lanjut / rotasi / PHK prosedural</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Tercapai {st.achieved ?? 0} dari {st.total ?? 0} target
              {(st.expired ?? 0) > 0 && ` · ${st.expired} kedaluwarsa`}
            </p>
            {(st.goals ?? []).map((g: any) => (
              <PipGoalRow
                key={g.id}
                goal={g}
                canProgress={canProgress && st.active}
                onSaved={() => { refetch(); }}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PipGoalRow({ goal: g, canProgress, onSaved }: {
  goal: any;
  canProgress: boolean;
  onSaved: () => void;
}) {
  const progressMutation = useUpdateGoalProgress();
  const { toast } = useToast();
  const [val, setVal] = useState<string>(String(g.actualValue ?? ''));
  const [saving, setSaving] = useState(false);

  const target = Number(g.targetValue || 0);
  const pct = target > 0 ? Math.min(100, Math.round((Number(g.actualValue || 0) / target) * 100)) : 0;

  async function save() {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) { toast('Nilai aktual harus angka ≥ 0', 'error'); return; }
    setSaving(true);
    try {
      await progressMutation.mutateAsync({ id: g.id, actualValue: n });
      toast('Progres tersimpan', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message ?? 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{String(g.title).replace(/^\[PIP\]\s*/, '')}</p>
          <p className="text-xs text-muted-foreground">
            {g.metric || '—'}{g.targetValue ? ` · target ${g.targetValue}` : ''}
          </p>
        </div>
        <Badge variant={g.status === 'ACHIEVED' ? 'success' : 'secondary'}>{g.status}</Badge>
      </div>
      {target > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
        </div>
      )}
      {canProgress && g.status !== 'ACHIEVED' && (
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min="0"
            className="h-8 text-sm w-32"
            placeholder="Nilai aktual"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
          <Button size="sm" variant="outline" disabled={saving} onClick={() => void save()}>
            {saving ? '…' : 'Simpan progres'}
          </Button>
        </div>
      )}
    </div>
  );
}
