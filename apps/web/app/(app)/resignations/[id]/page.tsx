'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApproveResignation, useRejectResignation } from '@/hooks/use-resignations';
import { Button, Card } from '@/components/ui';

interface ExitInterview {
  id: string;
  reason: string;
  feedback?: string;
  wouldRecommend?: boolean;
  areasForImprovement?: string;
  conductedBy: string;
  conductedAt: string;
}

interface OffboardingTask {
  id: string;
  taskName: string;
  assignedTo: string;
  category: string;
  status: string;
  completedAt?: string;
  notes?: string;
}

interface FinalSettlement {
  id: string;
  unusedLeavePayout: number;
  severanceAmount: number;
  loanDeduction: number;
  netPayout: number;
  status: string;
}

interface Resignation {
  id: string;
  type: string;
  reason: string;
  resignationDate: string;
  effectiveDate: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  employee: { id: string; employeeId: string; fullName: string; email: string };
  exitInterview: ExitInterview | null;
  offboardingTasks: OffboardingTask[];
  finalSettlement: FinalSettlement[];
}

export default function ResignationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [settlement, setSettlement] = useState<FinalSettlement | null>(null);
  const [settlementForm, setSettlementForm] = useState({ unusedLeavePayout: 0, severanceAmount: 0, loanDeduction: 0, netPayout: 0 });
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: req, isLoading, error } = useQuery({
    queryKey: ['resignation', params.id],
    queryFn: () => api.get<Resignation>(`/resignation/requests/${params.id}`),
  });

  const approveMutation = useApproveResignation();
  const rejectMutation = useRejectResignation();

  const loadSettlement = () =>
    api.get<FinalSettlement | null>(`/resignation/requests/${params.id}/final-settlement`)
      .then(s => { setSettlement(s); if (s) setSettlementForm({ unusedLeavePayout: Number(s.unusedLeavePayout), severanceAmount: Number(s.severanceAmount), loanDeduction: Number(s.loanDeduction), netPayout: Number(s.netPayout) }); })
      .catch(() => {});

  React.useEffect(() => { loadSettlement(); }, [params.id]);

  const handleSaveSettlement = async () => {
    setSettlementLoading(true);
    try { const s = await api.post<FinalSettlement>(`/resignation/requests/${params.id}/final-settlement`, settlementForm); setSettlement(s); setShowSettlementForm(false); }
    catch (e: any) { setActionError(e.message); } finally { setSettlementLoading(false); }
  };

  async function handleApprove() {
    setActionError('');
    try { await approveMutation.mutateAsync(params.id as string); }
    catch (e: any) { setActionError(e.message); }
  }

  async function handleReject() {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setActionError('');
    try { await rejectMutation.mutateAsync(params.id as string); }
    catch (e: any) { setActionError(e.message); }
  }

  async function handleOffboard() {
    if (!confirm('Execute offboarding? This will deactivate the employee and return assets.')) return;
    setActionLoading(true); setActionError('');
    try { await api.post(`/resignation/requests/${params.id}/offboard`, {}); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleCompleteTask(taskId: string) {
    setActionLoading(true); setActionError('');
    try { await api.put(`/resignation/requests/${params.id}/tasks/${taskId}`, {}); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  if (isLoading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error?.message}</div>;
  if (!req) return <p>Not found</p>;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>
      {actionError && <div className="text-red-500 text-sm mb-3">{actionError}</div>}

      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="m-0">{req.employee.fullName}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {req.employee.employeeId} · {req.employee.email} · {req.type.replace('_', ' ')}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            req.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            req.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            req.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>{req.status}</span>
        </div>

        <div className="flex gap-6 mb-4 text-xs">
          <div><strong>Reason</strong><br />{req.reason}</div>
          <div><strong>Resignation Date</strong><br />{new Date(req.resignationDate).toLocaleDateString('id-ID')}</div>
          <div><strong>Effective Date</strong><br />{new Date(req.effectiveDate).toLocaleDateString('id-ID')}</div>
        </div>

        {req.rejectedReason && (
          <p className="text-xs text-red-500">Rejection reason: {req.rejectedReason}</p>
        )}

        <h4 className="my-5 mb-2">Offboarding Tasks</h4>
        {req.offboardingTasks.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">No offboarding tasks yet.</p>
        )}
        {req.offboardingTasks.map((t: any) => (
          <div key={t.id} className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-700 text-xs">
            <div>
              <strong>{t.taskName}</strong>
              <span className="text-gray-500 dark:text-gray-400 ml-2">{t.category} · {t.assignedTo}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`${t.status === 'COMPLETED' ? 'text-green-500' : 'text-yellow-500'}`}>{t.status}</span>
              {t.status === 'PENDING' && (
                <Button variant="secondary" size="sm" onClick={() => handleCompleteTask(t.id)} disabled={actionLoading}>
                  Complete
                </Button>
              )}
            </div>
          </div>
        ))}

        {req.exitInterview && (
          <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="m-0 mb-2">Exit Interview</h4>
            <p className="text-xs">{req.exitInterview.reason}</p>
            {req.exitInterview.feedback && <p className="text-xs text-gray-500 dark:text-gray-400">Feedback: {req.exitInterview.feedback}</p>}
            {req.exitInterview.areasForImprovement && <p className="text-xs text-gray-500 dark:text-gray-400">Improvements: {req.exitInterview.areasForImprovement}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Would recommend: {req.exitInterview.wouldRecommend ? 'Yes' : 'No'} · Conducted: {new Date(req.exitInterview.conductedAt).toLocaleDateString('id-ID')}
            </p>
          </div>
        )}
      </Card>

      {req.status === 'APPROVED' && (
        <Card className="max-w-[700px] mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="m-0">Final Settlement</h4>
            <Button variant="secondary" size="sm" onClick={() => setShowSettlementForm(!showSettlementForm)}>
              {showSettlementForm ? 'Cancel' : settlement ? 'Edit' : 'Create'}
            </Button>
          </div>

          {settlement && !showSettlementForm && (
            <div className="text-xs grid grid-cols-2 gap-3">
              <div><strong>Unused Leave Payout</strong><br />{Number(settlement.unusedLeavePayout).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</div>
              <div><strong>Severance Amount</strong><br />{Number(settlement.severanceAmount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</div>
              <div><strong>Loan Deduction</strong><br /><span className="text-red-500">-{Number(settlement.loanDeduction).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</span></div>
              <div><strong>Net Payout</strong><br /><span className="text-green-600 font-semibold">{Number(settlement.netPayout).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</span></div>
              <div className="col-span-2"><strong>Status</strong>: <span className="font-semibold">{settlement.status.toUpperCase()}</span></div>
            </div>
          )}

          {showSettlementForm && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Unused Leave Payout</label>
                <input type="number" step="0.01" value={settlementForm.unusedLeavePayout} onChange={e => setSettlementForm({...settlementForm, unusedLeavePayout: +e.target.value})}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Severance Amount</label>
                <input type="number" step="0.01" value={settlementForm.severanceAmount} onChange={e => setSettlementForm({...settlementForm, severanceAmount: +e.target.value})}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Loan Deduction</label>
                <input type="number" step="0.01" value={settlementForm.loanDeduction} onChange={e => setSettlementForm({...settlementForm, loanDeduction: +e.target.value})}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Net Payout</label>
                <input type="number" step="0.01" value={settlementForm.netPayout} onChange={e => setSettlementForm({...settlementForm, netPayout: +e.target.value})}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div className="col-span-2">
                <Button onClick={handleSaveSettlement} disabled={settlementLoading}>{settlementLoading ? 'Saving…' : 'Save Settlement'}</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {req.status === 'PENDING' && (
        <div className="flex gap-3">
          <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 text-white border-none">
            {actionLoading ? '…' : '✓ Approve'}
          </Button>
          <Button onClick={handleReject} disabled={actionLoading} variant="danger">
            ✕ Reject
          </Button>
        </div>
      )}

      {req.status === 'APPROVED' && (
        <Button onClick={handleOffboard} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white border-none">
          {actionLoading ? '…' : '▶ Execute Offboarding'}
        </Button>
      )}
    </div>
  );
}
