'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCompilation } from '@/lib/hooks/use-manpower-planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { ArrowLeft, DollarSign, Users, Building2, ClipboardList } from 'lucide-react';
import type { CompilationDashboardItem } from '@/lib/types';

export default function CompilationDashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('');
  const { data, isLoading, error, refetch } = useCompilation(period || undefined);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat kompilasi'} onRetry={() => refetch()} />;

  const compilations: CompilationDashboardItem[] = data ?? [];

  const totalPlanned = compilations.reduce((s, c) => s + c.totalPlanned, 0);
  const totalCost = compilations.reduce((s, c) => s + c.totalCost, 0);
  const totalApprovedCost = compilations.reduce((s, c) => s + c.approvedCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kompilasi Manpower Plan</h1>
            <p className="text-sm text-muted-foreground">Agregasi lintas departemen dengan estimasi biaya</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter periode (e.g. 2026-H1)" value={period} onChange={e => setPeriod(e.target.value)} className="w-48" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Periode</p></div><p className="mt-1 text-xl font-bold">{compilations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Headcount Direncanakan</p></div><p className="mt-1 text-xl font-bold">{totalPlanned}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Biaya (Semua)</p></div><p className="mt-1 text-xl font-bold">Rp {totalCost.toLocaleString('id-ID')}</p></CardContent></Card>
      </div>

      {compilations.length === 0 ? (
        <EmptyState description="Belum ada data kompilasi." />
      ) : (
        compilations.map(comp => (
          <Card key={comp.period}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Periode: {comp.period}</CardTitle>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{comp.totalPlanned} headcount</Badge>
                  <Badge variant="outline">Rp {comp.totalCost.toLocaleString('id-ID')}</Badge>
                  <Badge variant="secondary" className="text-green-700 bg-green-100">Disetujui: Rp {comp.approvedCost.toLocaleString('id-ID')}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-1">Departemen</th>
                    <th className="text-right py-1">Headcount</th>
                    <th className="text-right py-1">Estimasi Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {comp.departmentBreakdown.map(d => (
                    <tr key={d.departmentId} className="border-b last:border-0">
                      <td className="py-2"><div className="flex items-center gap-2"><Building2 className="h-3 w-3 text-muted-foreground" />{d.departmentName}</div></td>
                      <td className="text-right py-2">{d.planned}</td>
                      <td className="text-right py-2 font-mono text-xs">Rp {d.cost.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
