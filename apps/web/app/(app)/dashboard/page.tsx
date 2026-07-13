'use client';

import Link from 'next/link';
import { useDashboard, useRecentActivity } from '@/hooks/use-dashboard';

const modules = [
  { href: '/employees', label: 'Employees', desc: 'View and manage employee records' },
  { href: '/employees/organization', label: 'Organization', desc: 'Departments, positions, grades, and org chart' },
  { href: '/expenses', label: 'Expenses', desc: 'Submit and approve expense claims' },
  { href: '/leaves', label: 'Leave', desc: 'Leave requests, balances, and approvals' },
  { href: '/attendance', label: 'Attendance', desc: 'Clock in/out and attendance records' },
  { href: '/assets', label: 'Assets', desc: 'Company asset inventory and assignments' },
  { href: '/benefits', label: 'Benefits', desc: 'Employee benefit plans and enrollments' },
  { href: '/payslips', label: 'Payslips', desc: 'View payslips and payment history' },
  { href: '/payroll', label: 'Payroll Periods', desc: 'Manage payroll periods and runs' },
  { href: '/cycles', label: 'Review Cycles', desc: 'Performance review cycle management' },
  { href: '/goals', label: 'Goals & OKRs', desc: 'Set and track performance goals' },
  { href: '/learning/trainings', label: 'Learning', desc: 'Training programs and certifications' },
  { href: '/jobs', label: 'Job Postings', desc: 'Manage recruitment and job openings' },
  { href: '/candidates', label: 'Candidates', desc: 'Track and manage candidates' },
  { href: '/applications', label: 'Applications', desc: 'Candidate applications pipeline' },
  { href: '/reviews', label: 'Performance Reviews', desc: 'Review cycles and employee evaluations' },
  { href: '/resignations', label: 'Resignations', desc: 'Resignation requests and offboarding' },
  { href: '/loans', label: 'Loans', desc: 'Loan applications and installment tracking' },
  { href: '/profile', label: 'My Profile', desc: 'Personal info, employment, and documents' },
  { href: '/analytics', label: 'Analytics', desc: 'Executive dashboard with KPIs and metrics' },
  { href: '/admin/roles', label: 'Admin', desc: 'Manage roles, tenants, and audit logs' },
];

export default function DashboardPage() {
  const { data } = useDashboard();
  const { data: activities = [] } = useRecentActivity();

  return (
    <div>
      <h2 className="text-lg font-bold mt-0 mb-4">Dashboard</h2>

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {[
          { value: data?.attendance?.isClockedIn ? '✓' : '—', label: 'Attendance' },
          { value: data?.pendingApprovals ?? '—', label: 'Pending Approvals' },
          { value: data?.recentPayslips?.length ?? 0, label: 'Recent Payslips' },
          { value: data?.leaveBalances?.length ?? 0, label: 'Leave Types' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {data?.leaveBalances && data.leaveBalances.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Leave Balances</h3>
          <div className="flex gap-3 flex-wrap">
            {data.leaveBalances.map((b: any) => (
              <div key={b.leaveType} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm min-w-[120px] dark:border-gray-700 dark:bg-gray-800">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{b.total - b.used}/{b.total}</div>
                <div className="text-xs text-gray-400">{b.leaveType}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-h-96 overflow-y-auto dark:border-gray-700 dark:bg-gray-800">
            {activities.length === 0 && <p className="text-sm text-gray-400">No recent activity.</p>}
            {activities.map((a: any) => (
              <div key={a.id} className="text-xs py-1.5 border-b border-gray-100 flex justify-between gap-2 dark:border-gray-700">
                <span><strong>{a.action}</strong> {a.entity} by {a.changedBy}</span>
                <span className="text-gray-400 whitespace-nowrap">{new Date(a.changedAt).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent Payslips</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-h-96 overflow-y-auto dark:border-gray-700 dark:bg-gray-800">
            {(!data?.recentPayslips || data.recentPayslips.length === 0) && <p className="text-sm text-gray-400">No payslips yet.</p>}
            {data?.recentPayslips?.map((p: any) => (
              <Link key={p.id} href={`/payslips/${p.id}`} className="no-underline">
                <div className="text-sm py-2 border-b border-gray-100 flex justify-between dark:border-gray-700">
                  <span className="text-gray-900 dark:text-gray-100">{p.run.name}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Rp {Number(p.netPay).toLocaleString('id-ID')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-3">Modules</h3>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {modules.map((m: any) => (
          <Link key={m.href} href={m.href} className="no-underline">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0 mb-1">{m.label}</h3>
              <p className="text-xs text-gray-400 m-0">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
