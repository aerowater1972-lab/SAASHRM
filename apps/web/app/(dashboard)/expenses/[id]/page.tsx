'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasPermission } from '@/lib/api';
import { useExpenseClaim, useApproveExpenseClaim, useRejectExpenseClaim } from '@/lib/hooks/expense';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, User, Tag, FileText, DollarSign } from 'lucide-react';

interface ExpenseItem { id: string; category: string; description: string; amount: number; date: string }

interface ExpenseClaim {
  id: string; title: string; description?: string; totalAmount: number;
  status: string; createdAt: string; submittedAt?: string;
  approvedBy?: string; approvedAt?: string; paidAt?: string; notes?: string;
  employee: { id: string; employeeId: string; fullName: string };
  items: ExpenseItem[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive', CANCELLED: 'secondary', PAID: 'info',
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { data: claim, isLoading, error, refetch } = useExpenseClaim(id);
  const approveClaim = useApproveExpenseClaim();
  const rejectClaim = useRejectExpenseClaim();
  const [actioning, setActioning] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState('');

  const canApprove = hasPermission('expense-claims:approve');
  const errMsg = (error instanceof Error ? error.message : '') || actionError;

  if (isLoading) return <PageSkeleton />;
  if (error || !claim) return <ErrorState message={errMsg || 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  const isPending = claim.status === 'PENDING';

  async function handleApprove() {
    setActioning(true); setActionError('');
    try {
      await approveClaim.mutateAsync(id);
      setNotes('');
      refetch();
    } catch (e: any) { setActionError(e.message); }
    finally { setActioning(false); }
  }

  async function handleReject() {
    if (!notes.trim()) { setActionError('Alasan wajib diisi untuk menolak'); return; }
    setActioning(true); setActionError('');
    try {
      await rejectClaim.mutateAsync(id);
      setNotes('');
      refetch();
    } catch (e: any) { setActionError(e.message); }
    finally { setActioning(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{claim.title}</h1>
          <p className="text-sm text-muted-foreground">Detail klaim pengeluaran</p>
        </div>
        <Badge variant={(statusVariant[claim.status] || 'secondary') as any} className="ml-auto">{claim.status}</Badge>
      </div>

      {errMsg && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errMsg}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Informasi Klaim</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm font-medium">{claim.employee?.fullName}</p><p className="text-xs text-muted-foreground">{claim.employee?.employeeId}</p></div></div>
            <Separator />
            <div className="flex items-start gap-3"><DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm font-medium">Rp {Number(claim.totalAmount).toLocaleString('id-ID')}</p><p className="text-xs text-muted-foreground">Total Amount</p></div></div>
            {claim.description && <><Separator /><div className="flex items-start gap-3"><FileText className="h-4 w-4 text-muted-foreground mt-0.5" /><p className="text-sm text-muted-foreground">{claim.description}</p></div></>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Dibuat</span><span>{new Date(claim.createdAt).toLocaleDateString('id-ID')}</span></div>
            {claim.submittedAt && <div className="flex justify-between"><span className="text-muted-foreground">Diajukan</span><span>{new Date(claim.submittedAt).toLocaleDateString('id-ID')}</span></div>}
            {claim.approvedAt && <div className="flex justify-between"><span className="text-muted-foreground">Disetujui</span><span>{new Date(claim.approvedAt).toLocaleDateString('id-ID')}</span></div>}
            {claim.paidAt && <div className="flex justify-between"><span className="text-muted-foreground">Dibayar</span><span>{new Date(claim.paidAt).toLocaleDateString('id-ID')}</span></div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Items</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claim.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">Rp {Number(item.amount).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(item.date).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {claim.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Catatan</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{claim.notes}</p></CardContent>
        </Card>
      )}

      {isPending && canApprove && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Aksi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Catatan</Label>
              <textarea
                rows={2} value={notes}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(e) => setNotes(e.target.value)} placeholder="Catatan untuk approve/reject"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={actioning}>{actioning ? 'Memproses…' : 'Setujui'}</Button>
              <Button variant="destructive" onClick={handleReject} disabled={actioning}>{actioning ? 'Memproses…' : 'Tolak'}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
