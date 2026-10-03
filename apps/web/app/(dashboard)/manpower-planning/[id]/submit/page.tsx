'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useManpowerPlan, useSubmitManpowerPlan } from '@/lib/hooks/use-manpower-planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';

export default function ManpowerPlanSubmitPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: plan, isLoading, error, refetch } = useManpowerPlan(id);
  const submitMutation = useSubmitManpowerPlan();
  const [submitError, setSubmitError] = useState('');

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!plan) return <p className="text-muted-foreground">Rencana tidak ditemukan</p>;

  if (plan.status !== 'DRAFT') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" /> Kembali</Button>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Rencana ini sudah dalam status {plan.status} dan tidak dapat disubmit.</CardContent></Card>
      </div>
    );
  }

  const items = plan.items || [];
  const totalCost = items.reduce((s: number, i: any) => s + (i.estimatedCost || 0) * i.quantity, 0);

  async function handleSubmit() {
    setSubmitError('');
    try {
      await submitMutation.mutateAsync(id);
      router.push(`/manpower-planning/${id}`);
    } catch (e: any) { setSubmitError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Rencana</h1>
          <p className="text-sm text-muted-foreground">{plan.department?.name || plan.departmentId} · {plan.period}</p>
        </div>
      </div>

      {submitError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{submitError}</div>}

      <Card>
        <CardHeader><CardTitle className="text-sm">Ringkasan Rencana</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Total Posisi</span><p className="text-xl font-bold">{items.length}</p></div>
          <div><span className="text-muted-foreground">Total Headcount</span><p className="text-xl font-bold">{items.reduce((s, i: any) => s + i.quantity, 0)}</p></div>
          <div><span className="text-muted-foreground">Estimasi Biaya</span><p className="text-xl font-bold">Rp {totalCost.toLocaleString('id-ID')}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Detail Posisi</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posisi</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Biaya/Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.positionTitle}</TableCell>
                  <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs">Rp {(item.estimatedCost || 0).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <span>Setelah disubmit, rencana akan masuk ke alur persetujuan HR dan Finance.</span>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Batal</Button>
        <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'Mengirim…' : <><Send className="mr-2 h-4 w-4" /> Submit untuk Persetujuan</>}
        </Button>
      </div>
    </div>
  );
}
