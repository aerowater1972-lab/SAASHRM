'use client';

import { useState } from 'react';
import { RequirePermission } from '@/components/require-permission';
import {
  useSalaryStructures, useCreateSalaryStructure,
  useReviewCycles, useCreateReviewCycle, useOpenReviewCycle, useApproveReviewCycle, useCloseReviewCycle,
  useEquityAnalysis,
} from '@/lib/hooks/compensation';
import { COMP_ADJUSTMENT_TYPES, compAdjustmentTypeLabels, compStatusLabels } from '@/lib/api/compensation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus } from 'lucide-react';

function rupiah(n: any) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '—';
  return 'Rp' + v.toLocaleString('id-ID');
}

function StructuresTab() {
  const [jobFamily, setJobFamily] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [fJob, setFJob] = useState('');
  const [fGrade, setFGrade] = useState('');
  const [fMin, setFMin] = useState('');
  const [fMid, setFMid] = useState('');
  const [fMax, setFMax] = useState('');
  const [fDate, setFDate] = useState('');
  const { data, isLoading, error, refetch } = useSalaryStructures({ jobFamily: jobFamily.trim() || undefined });
  const createM = useCreateSalaryStructure();
  const items: any[] = Array.isArray(data) ? data : [];

  const submit = () => {
    if (!fJob.trim() || !fGrade.trim() || !fMin || !fMid || !fMax || !fDate) return;
    createM.mutate(
      { jobFamily: fJob.trim(), grade: fGrade.trim(), minSalary: Number(fMin), midSalary: Number(fMid), maxSalary: Number(fMax), effectiveDate: fDate },
      { onSuccess: () => { setFJob(''); setFGrade(''); setFMin(''); setFMid(''); setFMax(''); setFDate(''); setShowNew(false); refetch(); } },
    );
  };

  if (isLoading) return <TableSkeleton rows={5} />;
  if (error) return <ErrorState message="Gagal memuat struktur gaji" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Filter job family" value={jobFamily} onChange={(e) => setJobFamily(e.target.value)} className="max-w-xs" />
        <Button onClick={() => setShowNew((v) => !v)}><Plus className="mr-2 h-4 w-4" /> Struktur Baru</Button>
      </div>
      {showNew && (
        <Card><CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          <Input placeholder="Job family (mis. Engineering)" value={fJob} onChange={(e) => setFJob(e.target.value)} />
          <Input placeholder="Grade (mis. E3)" value={fGrade} onChange={(e) => setFGrade(e.target.value)} />
          <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
          <Input type="number" placeholder="Min salary" value={fMin} onChange={(e) => setFMin(e.target.value)} />
          <Input type="number" placeholder="Mid salary" value={fMid} onChange={(e) => setFMid(e.target.value)} />
          <Input type="number" placeholder="Max salary" value={fMax} onChange={(e) => setFMax(e.target.value)} />
          <div className="md:col-span-3"><Button onClick={submit} disabled={createM.isPending}>Simpan</Button></div>
        </CardContent></Card>
      )}
      {items.length === 0 ? <EmptyState title="Belum ada struktur gaji" description="Buat rentang min-mid-max per job family &amp; grade." /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Job Family</TableHead><TableHead>Grade</TableHead><TableHead>Min</TableHead><TableHead>Mid</TableHead><TableHead>Max</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((s: any) => (
            <TableRow key={s.id}><TableCell>{s.jobFamily}</TableCell><TableCell><Badge variant="outline">{s.grade}</Badge></TableCell><TableCell>{rupiah(s.minSalary)}</TableCell><TableCell>{rupiah(s.midSalary)}</TableCell><TableCell>{rupiah(s.maxSalary)}</TableCell></TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  );
}

function CyclesTab() {
  const { data, isLoading, error, refetch } = useReviewCycles();
  const createM = useCreateReviewCycle();
  const openM = useOpenReviewCycle();
  const approveM = useApproveReviewCycle();
  const closeM = useCloseReviewCycle();
  const [name, setName] = useState('');
  const [effDate, setEffDate] = useState('');
  const cycles: any[] = Array.isArray(data) ? data : [];

  const submit = () => {
    if (!name.trim() || !effDate) return;
    createM.mutate({ name: name.trim(), effectiveDate: effDate }, { onSuccess: () => { setName(''); setEffDate(''); refetch(); } });
  };

  if (isLoading) return <TableSkeleton rows={4} />;
  if (error) return <ErrorState message="Gagal memuat review cycle" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-end gap-2 pt-4">
        <div className="min-w-52 flex-1"><Input placeholder="Nama cycle (mis. Annual Review 2027)" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Input type="date" value={effDate} onChange={(e) => setEffDate(e.target.value)} className="max-w-44" />
        <Button onClick={submit} disabled={createM.isPending}><Plus className="mr-2 h-4 w-4" /> Buat Cycle</Button>
      </CardContent></Card>
      {cycles.length === 0 ? <EmptyState title="Belum ada review cycle" description="Buat cycle lalu buka, approve, tutup." /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Budget</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{cycles.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell><Badge variant="outline">{compStatusLabels[c.status] ?? c.status}</Badge></TableCell>
              <TableCell>{c.totalBudget ? rupiah(c.totalBudget) + ' / ' + rupiah(c.allocatedBudget) : '—'}</TableCell>
              <TableCell className="space-x-1">
                {c.status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => openM.mutate(c.id, { onSuccess: () => refetch() })}>Buka</Button>}
                {(c.status === 'OPEN' || c.status === 'IN_REVIEW') && <Button size="sm" variant="outline" onClick={() => approveM.mutate(c.id, { onSuccess: () => refetch() })}>Approve</Button>}
                {c.status === 'APPROVED' && <Button size="sm" variant="outline" onClick={() => closeM.mutate(c.id, { onSuccess: () => refetch() })}>Tutup</Button>}
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
      <p className="text-xs text-muted-foreground">Tipe adjustment: {COMP_ADJUSTMENT_TYPES.map((t) => compAdjustmentTypeLabels[t]).join(' · ')}</p>
    </div>
  );
}

function EquityTab() {
  const [jobFamily, setJobFamily] = useState('');
  const { data, isLoading, error, refetch } = useEquityAnalysis({ jobFamily: jobFamily.trim() || undefined });
  const rows: any[] = (data as any)?.items ?? [];
  const summary: any = (data as any)?.summary ?? null;
  if (isLoading) return <TableSkeleton rows={5} />;
  if (error) return <ErrorState message="Gagal memuat analisis equity" onRetry={() => refetch()} />;
  const bandLabel: Record<string, string> = { WITHIN: 'Dalam rentang', BELOW: 'Di bawah', ABOVE: 'Di atas', UNKNOWN: '—' };
  return (
    <div className="space-y-4">
      <Input placeholder="Filter job family" value={jobFamily} onChange={(e) => setJobFamily(e.target.value)} className="max-w-xs" />
      {summary && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="default">Dalam rentang: {summary.withinBand}</Badge>
          <Badge variant="outline">Di bawah: {summary.belowBand}</Badge>
          <Badge variant="outline">Di atas: {summary.aboveBand}</Badge>
        </div>
      )}
      {rows.length === 0 ? <EmptyState title="Belum ada data equity" description="Compa-ratio = gaji aktual dibanding midpoint struktur." /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Karyawan</TableHead><TableHead>Gaji</TableHead><TableHead>Compa-Ratio</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((r: any, i: number) => (
            <TableRow key={r.employee?.id ?? i}>
              <TableCell className="font-medium">{r.employee?.fullName ?? r.employee?.employeeId ?? '—'}</TableCell>
              <TableCell>{rupiah(r.currentSalary)}</TableCell>
              <TableCell>{r.compaRatio != null ? `${r.compaRatio}%` : '—'}</TableCell>
              <TableCell><Badge variant={r.band === 'WITHIN' ? 'default' : 'outline'}>{bandLabel[r.band] ?? r.band}</Badge></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  );
}

function CompensationInner() {
  const [tab, setTab] = useState<'structures' | 'cycles' | 'equity'>('structures');
  const tabs = [
    ['structures', 'Struktur Gaji'],
    ['cycles', 'Review Cycle'],
    ['equity', 'Equity Analysis'],
  ] as const;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compensation Management</h1>
        <p className="text-sm text-muted-foreground">Struktur gaji, review cycle &amp; approval, analisis equity (GAP-06)</p>
      </div>
      <div className="flex gap-2">
        {tabs.map(([k, label]) => (
          <Button key={k} variant={tab === k ? 'default' : 'outline'} size="sm" onClick={() => setTab(k)}>{label}</Button>
        ))}
      </div>
      {tab === 'structures' && <StructuresTab />}
      {tab === 'cycles' && <CyclesTab />}
      {tab === 'equity' && <EquityTab />}
    </div>
  );
}

export default function CompensationPage() {
  return (
    <RequirePermission permission="compensation:view">
      <CompensationInner />
    </RequirePermission>
  );
}

