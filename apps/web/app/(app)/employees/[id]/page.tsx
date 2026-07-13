'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { useEmployee } from '@/hooks/use-employees';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e',
  PENDING_ACTIVATION: '#eab308',
  INACTIVE: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_ACTIVATION: 'Pending Activation',
  INACTIVE: 'Inactive',
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const queryClient = useQueryClient();
  const { data: employee, isLoading, error: fetchError } = useEmployee(id);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function handleActivate() {
    setActionLoading(true); setActionError('');
    try { await api.post(`/employees/${id}/activate`, {}); queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) }); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleDeactivate() {
    if (!confirm('Deactivate this employee?')) return;
    setActionLoading(true); setActionError('');
    try { await api.post(`/employees/${id}/deactivate`, {}); queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) }); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  const displayError = actionError || (fetchError ? (fetchError instanceof Error ? fetchError.message : 'Failed to load') : '');

  if (isLoading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (displayError) return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{displayError}</div>;
  if (!employee) return null;

  const emp = employee.employments?.[0];
  const statusColor = STATUS_COLORS[employee.status] || 'var(--muted)';

  const links = [
    { label: 'Expenses', href: `/expenses?employee=${id}` },
    { label: 'Leaves', href: `/leaves?employee=${id}` },
    { label: 'Loans', href: `/loans?employee=${id}` },
    { label: 'Goals & OKRs', href: `/goals?employee=${id}` },
    { label: 'Performance Reviews', href: `/reviews?employee=${id}` },
    { label: 'Resignation', href: `/resignations?employee=${id}` },
    { label: 'Assets', href: `/assets?employee=${id}` },
  ];

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => router.back()} className="mb-4">← Back</Button>
      <Card className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="m-0">{employee.fullName}</h2>
            <p className="m-0 mt-1 text-gray-500 dark:text-gray-400">
              {employee.employeeId} · {employee.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: statusColor, fontWeight: 700, fontSize: 13 }}>
              {STATUS_LABELS[employee.status] || employee.status}
            </span>
            {employee.status === 'PENDING_ACTIVATION' && (
              <Button variant="primary" size="sm" onClick={handleActivate} disabled={actionLoading}>
                {actionLoading ? '…' : 'Activate'}
              </Button>
            )}
            {employee.status === 'ACTIVE' && (
              <Button variant="danger" size="sm" onClick={handleDeactivate} disabled={actionLoading}>
                {actionLoading ? '…' : 'Deactivate'}
              </Button>
            )}
          </div>
        </div>
        <hr className="border-gray-200 dark:border-gray-700" />
        <dl className="grid text-sm" style={{ gridTemplateColumns: '160px 1fr', rowGap: 8 }}>
          <dt className="text-gray-500 dark:text-gray-400">Department</dt>
          <dd className="m-0">{emp?.department?.name ?? '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Position</dt>
          <dd className="m-0">{emp?.position?.name ?? '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Grade</dt>
          <dd className="m-0">{emp?.grade?.name ?? '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
          <dd className="m-0">{employee.phone ?? '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Birth Date</dt>
          <dd className="m-0">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('id-ID') : '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Gender</dt>
          <dd className="m-0">{employee.gender ?? '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Start Date</dt>
          <dd className="m-0">{employee.startDate ? new Date(employee.startDate).toLocaleDateString('id-ID') : '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">ID Card</dt>
          <dd className="m-0">{employee.idCardNumber ?? '—'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Tax ID</dt>
          <dd className="m-0">{employee.taxIdNumber ?? '—'}</dd>
        </dl>
      </Card>

      <h3 className="mb-3">Related Records</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {links.map((l: any) => (
          <Link key={l.label} href={l.href} className="no-underline">
            <Card className="cursor-pointer text-center">
              <div className="text-sm font-semibold">{l.label}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
