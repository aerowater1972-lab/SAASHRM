'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useManpowerPlan, useApproveManpowerPlan } from '@/lib/hooks/use-manpower-planning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

const approvalStatuses = ['HR_REVIEW', 'FINANCE_REVIEW'];

export default function ManpowerPlanApprovePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: plan, isLoading, error, refetch } = useManpowerPlan(id);
  const approveMutation = useApproveManpowerPlan();
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!plan) return <p className="text-muted-foreground">Rencana tidak ditemukan</p>;

  if (!approvalStatuses.includes(plan.status)) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" /> Kembali</Button>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Rencana ini tidak dalam status review. Status saat ini: {plan.status}</CardContent></Card>
      </div>
    );
  }

  const items = plan.items || [];

  async function handleAction(action: 'APPROVE' | 'REJECT') {
    setActionError('');
    if (action === 'REJECT' && !reason.trim()) { setActionError('Alasan penolakan harus diisi.'); return; }
    try {
      await approveMutation.mutateAsync({ id, data: { action, reason: reason.trim() || undefined } });
      router.push(`/manpower-planning/${id}`);
    } catch (e: any) { setActionError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Rencana</h1>
          <p className="text-sm text-muted-foreground">{plan.department?.name || plan.departmentId} · {plan.period}</p>
        </div>
        <Badge variant={plan.status === 'HR_REVIEW' ? 'info' : 'warning'} className="ml-auto">{plan.status}</Badge>
      </div>

      {actionError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</div>}

      <Card>
        <CardHeader><CardTitle className="text-sm">Ringkasan Rencana</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Total Posisi</span><p className="text-xl font-bold">{items.length}</p></div>
          <div><span className="text-muted-foreground">Total Headcount</span><p className="text-xl font-bold">{items.reduce((s: number, i: any) => s + i.quantity, 0)}</p></div>
          <div><span className="text-muted-foreground">Estimasi Biaya</span><p className="text-xl font-bold">Rp {items.reduce((s, i: any) => s + (i.estimatedCost || 0) * i.quantity, 0).toLocaleString('id-ID')}</p></div>
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

      <Card>
        <CardHeader><CardTitle className="text-sm">Keputusan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Alasan (wajib jika ditolak)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masukkan catatan atau alasan" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleAction('APPROVE')} disabled={approveMutation.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" /> Setujui
            </Button>
            <Button variant="destructive" onClick={() => handleAction('REJECT')} disabled={approveMutation.isPending}>
              <XCircle className="mr-2 h-4 w-4" /> Tolak
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
