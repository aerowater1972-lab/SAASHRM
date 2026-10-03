'use client';

import { useParams, useRouter } from 'next/navigation';
import { useManpowerPlan, useLinkRequisitionToPlan } from '@/lib/hooks/use-manpower-planning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Send, CheckCircle, Edit, Link2 } from 'lucide-react';
import { useState } from 'react';

const statusVariant: Record<string, 'secondary' | 'warning' | 'info' | 'success' | 'destructive'> = {
  DRAFT: 'secondary', SUBMITTED: 'warning', HR_REVIEW: 'info', FINANCE_REVIEW: 'info', APPROVED: 'success', REJECTED: 'destructive',
};

const typeLabel: Record<string, string> = { NEW: 'Baru', REPLACEMENT: 'Pengganti' };

export default function ManpowerPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: plan, isLoading, error, refetch } = useManpowerPlan(id);
  const linkMutation = useLinkRequisitionToPlan();

  const [linkItemId, setLinkItemId] = useState('');
  const [linkRequisitionId, setLinkRequisitionId] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [actionError, setActionError] = useState('');

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!plan) return <p className="text-muted-foreground">Rencana tidak ditemukan</p>;

  async function handleLinkRequisition() {
    setActionError('');
    if (!linkItemId || !linkRequisitionId) { setActionError('Item dan requisition harus diisi.'); return; }
    try {
      await linkMutation.mutateAsync({ planId: id, data: { manpowerPlanItemId: linkItemId, requisitionId: linkRequisitionId } });
      setShowLinkForm(false);
    } catch (e: any) { setActionError(e.message); }
  }

  const items = plan.items || [];
  const totalCost = items.reduce((sum: number, i: any) => sum + (i.estimatedCost || 0) * i.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Rencana</h1>
          <p className="text-sm text-muted-foreground">{plan.department?.name || plan.departmentId} · {plan.period}</p>
        </div>
          <Badge variant={statusVariant[plan.status] || 'secondary'} className="ml-auto">{plan.status}</Badge>
          {plan.version && <span className="text-xs text-muted-foreground">v{plan.version}</span>}
        </div>

      {actionError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</div>}

      <div className="flex gap-2">
        {plan.status === 'DRAFT' && (
          <>
            <Button variant="outline" size="sm" onClick={() => router.push(`/manpower-planning/new?id=${plan.id}`)}>
              <Edit className="mr-1 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/manpower-planning/${plan.id}/submit`)}>
              <Send className="mr-1 h-4 w-4" /> Submit
            </Button>
          </>
        )}
        {(plan.status === 'HR_REVIEW' || plan.status === 'FINANCE_REVIEW') && (
          <Button variant="outline" size="sm" onClick={() => router.push(`/manpower-planning/${plan.id}/approve`)}>
            <CheckCircle className="mr-1 h-4 w-4" /> Review
          </Button>
        )}
        {plan.status === 'APPROVED' && (
          <Button variant="outline" size="sm" onClick={() => setShowLinkForm(!showLinkForm)}>
            <Link2 className="mr-1 h-4 w-4" /> Link Requisition
          </Button>
        )}
      </div>

      {showLinkForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Link Requisition</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Plan Item ID</Label>
              <Input value={linkItemId} onChange={(e) => setLinkItemId(e.target.value)} placeholder="ID item posisi" />
            </div>
            <div className="space-y-2">
              <Label>Requisition ID</Label>
              <Input value={linkRequisitionId} onChange={(e) => setLinkRequisitionId(e.target.value)} placeholder="ID requisition" />
            </div>
            <Button onClick={handleLinkRequisition} disabled={linkMutation.isPending}>Link</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Ringkasan</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Total Posisi</span><p className="text-xl font-bold">{items.length}</p></div>
          <div><span className="text-muted-foreground">Total Headcount</span><p className="text-xl font-bold">{items.reduce((s: number, i: any) => s + i.quantity, 0)}</p></div>
          <div><span className="text-muted-foreground">Estimasi Biaya</span><p className="text-xl font-bold">Rp {totalCost.toLocaleString('id-ID')}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Item Posisi</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posisi</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Biaya/Unit</TableHead>
                <TableHead className="text-right">Total Biaya</TableHead>
                <TableHead>Requisition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.positionTitle}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabel[item.type] || item.type}</Badge></TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs">Rp {(item.estimatedCost || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-mono text-xs">Rp {((item.estimatedCost || 0) * item.quantity).toLocaleString('id-ID')}</TableCell>
                  <TableCell>{item.jobRequisitions?.length > 0 ? item.jobRequisitions.map((r: any) => r.title).join(', ') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
