'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, hasPermission } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface LeaveDetail {
  id: string;
  leaveType: { id: string; name: string; code: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  employee: { employeeId: string; fullName: string; email: string };
}

export default function LeaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const queryClient = useQueryClient();
  const queryKey = ['leave-request', id];
  const { data: request, error: queryError, isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: () => api.get<LeaveDetail>(`/attendance/leave-requests/${id}`),
  });
  const [actioning, setActioning] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState('');

  const canApprove = hasPermission('leave-requests:approve');
  const isPending = request?.status === 'PENDING';
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  async function handleApprove() {
    setActioning(true);
    try {
      const q = notes ? `?notes=${encodeURIComponent(notes)}` : '';
      await api.put<LeaveDetail>(`/attendance/leave-requests/${id}/approve${q}`);
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
      await api.put<LeaveDetail>(`/attendance/leave-requests/${id}/reject${q}`);
      queryClient.invalidateQueries({ queryKey });
      setNotes('');
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActioning(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this leave request?')) return;
    setActioning(true);
    try {
      await api.put<any>(`/attendance/leave-requests/${id}`);
      queryClient.invalidateQueries({ queryKey });
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActioning(false);
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!request) return null;

  return (
    <div>
      <Link href="/leaves" className="text-xs">← Back</Link>
      <Card className="mt-4">
        <h2 className="mt-0">{request.leaveType.name}</h2>
        <p className="text-gray-400">
          {request.employee.fullName} · {request.status}
        </p>

        <hr className="border-gray-700" />
        <dl className="grid grid-cols-[120px_1fr] gap-y-2">
          <dt className="text-gray-400">Dates</dt>
          <dd className="m-0">
            {new Date(request.startDate).toLocaleDateString('id-ID')} – {new Date(request.endDate).toLocaleDateString('id-ID')}
          </dd>
          <dt className="text-gray-400">Days</dt>
          <dd className="m-0">{request.totalDays}</dd>
          <dt className="text-gray-400">Reason</dt>
          <dd className="m-0">{request.reason || '—'}</dd>
          {request.approvedBy && (
            <>
              <dt className="text-gray-400">Approved by</dt>
              <dd className="m-0">{request.approvedBy}</dd>
            </>
          )}
        </dl>

        {isPending && (
          <div className="mt-6">
            <hr className="border-gray-700" />
            {canApprove && (
              <>
                <textarea
                  placeholder="Notes / reason"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 mt-2"
                />
                <div className="flex gap-2 mt-2">
                  <Button disabled={actioning} onClick={handleApprove}>
                    {actioning ? 'Processing…' : 'Approve'}
                  </Button>
                  <Button variant="danger" disabled={actioning} onClick={handleReject}>
                    {actioning ? 'Processing…' : 'Reject'}
                  </Button>
                </div>
              </>
            )}
            <div className={canApprove ? 'mt-2' : ''}>
              <Button disabled={actioning} onClick={handleCancel} variant="secondary" size="sm">
                Cancel Request
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
