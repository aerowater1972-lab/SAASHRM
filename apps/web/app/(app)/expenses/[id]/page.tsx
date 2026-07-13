'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, hasPermission } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

interface ExpenseClaim {
  id: string;
  title: string;
  description?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
  employee: { id: string; employeeId: string; fullName: string };
  items: ExpenseItem[];
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const queryClient = useQueryClient();
  const queryKey = ['expense', id];
  const { data: claim, error: queryError, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => api.get<ExpenseClaim>(`/expense/claims/${id}`),
  });
  const [actioning, setActioning] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState('');

  const canApprove = hasPermission('expense-claims:approve');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  async function handleApprove() {
    setActioning(true);
    try {
      const q = notes ? `?notes=${encodeURIComponent(notes)}` : '';
      await api.put<ExpenseClaim>(`/expense/claims/${id}/approve${q}`);
      queryClient.invalidateQueries({ queryKey });
      setNotes('');
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActioning(false);
    }
  }

  async function handleReject() {
    if (!notes.trim()) { setActionError('Reason is required to reject'); return; }
    setActioning(true);
    try {
      const q = `?reason=${encodeURIComponent(notes)}`;
      await api.put<ExpenseClaim>(`/expense/claims/${id}/reject${q}`);
      queryClient.invalidateQueries({ queryKey });
      setNotes('');
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActioning(false);
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!claim) return null;

  const isPending = claim.status === 'PENDING';

  return (
    <div>
      <Link href="/expenses" className="text-xs">← Back to expenses</Link>
      <Card className="max-w-full mt-4">
        <h2 className="mt-0">{claim.title}</h2>
        <p className="text-gray-400">
          {claim.employee.fullName} · {claim.employee.employeeId} · {claim.status}
        </p>
        {claim.description && <p>{claim.description}</p>}
        <hr className="border-gray-700" />

        {claim.items.length > 0 && (
          <>
            <h4>Items</h4>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-1.5">Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {claim.items.map((item: any) => (
                  <tr key={item.id} className="border-t border-gray-700">
                    <td className="py-2">{item.category}</td>
                    <td>{item.description}</td>
                    <td>{Number(item.amount).toLocaleString('id-ID')}</td>
                    <td>{new Date(item.date).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={2} className="py-2">Total</td>
                  <td>{Number(claim.totalAmount).toLocaleString('id-ID')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {isPending && canApprove && (
          <div className="mt-6">
            <hr className="border-gray-700" />
            <textarea
              placeholder="Notes (optional for approve, required for reject)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 mt-2"
            />
            <div className="flex gap-2 mt-2">
              <Button disabled={actioning} onClick={handleApprove}>
                {actioning ? 'Approving…' : 'Approve'}
              </Button>
              <Button variant="danger" disabled={actioning} onClick={handleReject}>
                {actioning ? 'Rejecting…' : 'Reject'}
              </Button>
            </div>
          </div>
        )}

        {claim.notes && (
          <div className="mt-4 text-gray-400">
            <strong>Notes:</strong> {claim.notes}
          </div>
        )}
      </Card>
    </div>
  );
}
