'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/api';
import { useLoan, useApproveLoan, useRejectLoan } from '@/lib/hooks/expense';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, User, DollarSign, CalendarDays } from 'lucide-react';

interface Installment { id: string; amount: number; dueDate: string; paidDate?: string; status: string }

interface Loan {
  id: string; amount: number; installmentCount: number; installmentAmount: number;
  remainingBalance: number; purpose?: string; startDeductionFrom?: string;
  notes?: string; status: string; approvedBy?: string; createdAt: string;
  employee: { id: string; employeeId: string; fullName: string };
  installments: Installment[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive', CANCELLED: 'secondary',
};

const instStatusVariant: Record<string, 'success' | 'warning' | 'secondary'> = {
  PAID: 'success', PENDING: 'warning', OVERDUE: 'warning',
};

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: loan, isLoading, error, refetch } = useLoan(id);
  const approveLoan = useApproveLoan();
  const rejectLoan = useRejectLoan();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const canApprove = hasPermission('loans:approve');
  const errMsg = (error instanceof Error ? error.message : '') || actionError;

  if (isLoading) return <PageSkeleton />;
  if (error || !loan) return <ErrorState message={errMsg || 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  async function handleApprove() {
    setActionLoading(true); setActionError('');
    try { await approveLoan.mutateAsync(id); refetch(); }
    catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleReject() {
    const reason = prompt('Alasan penolakan:');
    if (!reason) return;
    setActionLoading(true); setActionError('');
    try { await rejectLoan.mutateAsync(id); refetch(); }
    catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{loan.purpose || 'Loan Application'}</h1>
          <p className="text-sm text-muted-foreground">Detail pengajuan pinjaman</p>
        </div>
        <Badge variant={(statusVariant[loan.status] || 'secondary') as any} className="ml-auto">{loan.status}</Badge>
      </div>

      {errMsg && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errMsg}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Informasi Pinjaman</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm font-medium">{loan.employee?.fullName}</p><p className="text-xs text-muted-foreground">{loan.employee?.employeeId}</p></div></div>
            <Separator />
            <div className="flex items-start gap-3"><DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-2xl font-bold">Rp {Number(loan.amount).toLocaleString('id-ID')}</p><p className="text-xs text-muted-foreground">{loan.installmentCount}× Rp {Number(loan.installmentAmount).toLocaleString('id-ID')}/bulan</p></div></div>
            <Separator />
            <div className="flex items-start gap-3"><DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="text-sm font-medium">Sisa: Rp {Number(loan.remainingBalance).toLocaleString('id-ID')}</p></div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Lainnya</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Dibuat</span><span>{new Date(loan.createdAt).toLocaleDateString('id-ID')}</span></div>
            {loan.startDeductionFrom && <div className="flex justify-between"><span className="text-muted-foreground">Mulai Potong</span><span>{loan.startDeductionFrom}</span></div>}
            {loan.approvedBy && <div className="flex justify-between"><span className="text-muted-foreground">Disetujui oleh</span><span>{loan.approvedBy}</span></div>}
          </CardContent>
        </Card>
      </div>

      {loan.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Catatan</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{loan.notes}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Cicilan ({loan.installments?.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibayar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.installments?.map((inst: any, i: number) => (
                  <TableRow key={inst.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>{new Date(inst.dueDate).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right font-mono">Rp {Number(inst.amount).toLocaleString('id-ID')}</TableCell>
                    <TableCell><Badge variant={(instStatusVariant[inst.status] || 'secondary') as any}>{inst.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{inst.paidDate ? new Date(inst.paidDate).toLocaleDateString('id-ID') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {canApprove && loan.status === 'PENDING' && (
        <div className="flex gap-3">
          <Button onClick={handleApprove} disabled={actionLoading}>{actionLoading ? 'Memproses…' : 'Setujui'}</Button>
          <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>{actionLoading ? 'Memproses…' : 'Tolak'}</Button>
        </div>
      )}
    </div>
  );
}
