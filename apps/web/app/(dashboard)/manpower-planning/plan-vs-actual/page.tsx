'use client';

import { useState } from 'react';
import { usePlanVsActual } from '@/lib/hooks/use-manpower-planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PlanVsActualPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = usePlanVsActual({ page, limit: 20 });

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;

  const items = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalPlanned = items.reduce((s: number, i: any) => s + (i.plannedHeadcount || 0), 0);
  const totalActual = items.reduce((s: number, i: any) => s + (i.actualHeadcount || 0), 0);
  const totalPlannedCost = items.reduce((s: number, i: any) => s + (i.plannedCost || 0), 0);
  const totalActualCost = items.reduce((s: number, i: any) => s + (i.actualCost || 0), 0);

  function getFulfillmentBadge(rate: number): 'success' | 'warning' | 'destructive' {
    if (rate >= 90) return 'success';
    if (rate >= 50) return 'warning';
    return 'destructive';
  }

  function getVarianceIcon(variance: number) {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan vs Actual</h1>
          <p className="text-sm text-muted-foreground">Analisis perbandingan rencana dan realisasi tenaga kerja</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Planned Headcount</p>
            <p className="mt-1 text-xl font-bold">{totalPlanned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actual Headcount</p>
            <p className="mt-1 text-xl font-bold">{totalActual}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Planned Cost</p>
            <p className="mt-1 text-xl font-bold">Rp {totalPlannedCost.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actual Cost</p>
            <p className="mt-1 text-xl font-bold">Rp {totalActualCost.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Perbandingan Headcount</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={items}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="departmentName" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="plannedHeadcount" name="Planned" fill="#3b82f6" />
                <Bar dataKey="actualHeadcount" name="Actual" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Per Departemen</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState description="Belum ada data plan vs actual." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Fulfillment</TableHead>
                    <TableHead className="text-right">Planned Cost</TableHead>
                    <TableHead className="text-right">Actual Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, idx: number) => (
                    <TableRow key={item.departmentId || idx}>
                      <TableCell className="font-medium">{item.departmentName || item.departmentId}</TableCell>
                      <TableCell>{item.period}</TableCell>
                      <TableCell className="text-right">{item.plannedHeadcount ?? 0}</TableCell>
                      <TableCell className="text-right">{item.actualHeadcount ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getVarianceIcon(item.varianceHeadcount ?? 0)}
                          <span>{(item.varianceHeadcount ?? 0) > 0 ? '+' : ''}{item.varianceHeadcount ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getFulfillmentBadge(item.fulfillmentRate ?? 0)}>
                          {(item.fulfillmentRate ?? 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">Rp {(item.plannedCost ?? 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-mono text-xs">Rp {(item.actualCost ?? 0).toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Selanjutnya</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
