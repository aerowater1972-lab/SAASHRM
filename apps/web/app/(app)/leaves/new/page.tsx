'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getToken } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select } from '@/components/ui';

interface LeaveType {
  id: string;
  name: string;
  code: string;
}

export default function NewLeavePage() {
  const router = useRouter();
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.get<LeaveType[]>('/attendance/leave-types'),
  });
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const employeeId = (() => { try { const t = getToken(); if (!t) return null; return JSON.parse(atob(t.split('.')[1])).employeeId; } catch { return null; } })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveTypeId) { setError('Leave type is required'); return; }
    if (!startDate || !endDate) { setError('Start and end dates are required'); return; }
    if (new Date(endDate) < new Date(startDate)) { setError('End date must be after start date'); return; }
    setSaving(true);
    setError('');
    try {
      const req = await api.post<any>('/attendance/leave-requests', {
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
      router.push(`/leaves/${req.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!employeeId) {
    return (
      <div>
        <Link href="/leaves" className="text-xs">← Back</Link>
        <Card className="mt-4">
          <p>Your account doesn&apos;t have an employee profile.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Link href="/leaves" className="text-xs">← Back</Link>
      <h2 className="mt-2">New Leave Request</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card className="max-w-md">
          <div className="mb-3">
            <Select
              label="Leave Type"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              options={[{ value: '', label: 'Select…' }, ...leaveTypes.map((lt: any) => ({ value: lt.id, label: `${lt.name} (${lt.code})` }))]}
            />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</Button>
        </Card>
      </form>
    </div>
  );
}
