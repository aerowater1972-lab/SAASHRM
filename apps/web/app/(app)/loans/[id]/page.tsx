'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, hasPermission } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
}

interface Loan {
  id: string;
  amount: number;
  installmentCount: number;
  installmentAmount: number;
  remainingBalance: number;
  purpose?: string;
  startDeductionFrom?: string;
  notes?: string;
  status: string;
  approvedBy?: string;
  createdAt: string;
  employee: { id: string; employeeId: string; fullName: string };
  installments: Installment[];
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ['loan', params.id];
  const { data: loan, error: queryError, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => api.get<Loan>(`/expense/loans/${params.id}`),
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const canApprove = hasPermission('loans:approve');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  async function handleApprove() {
    setActionLoading(true); setActionError('');
    try {
      await api.put(`/expense/loans/${params.id}/approve`, {});
      queryClient.invalidateQueries({ queryKey });
    } catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleReject() {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setActionLoading(true); setActionError('');
    try {
      await api.put(`/expense/loans/${params.id}/reject?reason=${encodeURIComponent(reason)}`, {});
      queryClient.invalidateQueries({ queryKey });
    } catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!loan) return <p>Not found</p>;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-2xl mb-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="m-0">{loan.purpose || 'Loan Application'}</h3>
            <p className="m-1 text-gray-400 text-xs">
              {loan.employee.fullName} · {loan.employee.employeeId}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">Rp {Number(loan.amount).toLocaleString('id-ID')}</div>
            <div className="text-xs text-gray-400">{loan.installmentCount}× Rp {Number(loan.installmentAmount).toLocaleString('id-ID')}/mo</div>
          </div>
        </div>

        <div className="flex gap-6 mb-4 text-xs">
          <div><strong>Status</strong><br /><span className={loan.status === 'APPROVED' ? 'text-green-500' : loan.status === 'REJECTED' ? 'text-red-500' : 'text-yellow-500'}>{loan.status}</span></div>
          <div><strong>Remaining</strong><br />Rp {Number(loan.remainingBalance).toLocaleString('id-ID')}</div>
          <div><strong>Start Deduction</strong><br />{loan.startDeductionFrom || '—'}</div>
          <div><strong>Created</strong><br />{new Date(loan.createdAt).toLocaleDateString('id-ID')}</div>
        </div>

        {loan.notes && <p className="text-xs italic m-0 mb-3">Notes: {loan.notes}</p>}

        <h4 className="my-4">Installments</h4>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th className="py-1.5">#</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {loan.installments.map((inst: any, i: any) => (
              <tr key={inst.id} className="border-t border-gray-700">
                <td className="py-1.5">{i + 1}</td>
                <td>{new Date(inst.dueDate).toLocaleDateString('id-ID')}</td>
                <td>Rp {Number(inst.amount).toLocaleString('id-ID')}</td>
                <td>{inst.status}</td>
                <td>{inst.paidDate ? new Date(inst.paidDate).toLocaleDateString('id-ID') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {canApprove && loan.status === 'PENDING' && (
        <div className="flex gap-3">
          <Button onClick={handleApprove} disabled={actionLoading}>
            {actionLoading ? 'Processing…' : '✓ Approve'}
          </Button>
          <Button variant="danger" onClick={handleReject} disabled={actionLoading}>
            ✕ Reject
          </Button>
        </div>
      )}
    </div>
  );
}
