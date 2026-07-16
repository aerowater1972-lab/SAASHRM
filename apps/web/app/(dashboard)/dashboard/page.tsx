'use client';

import Link from 'next/link';
import { useDashboard, useRecentActivity } from '@/hooks/use-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutDashboard, Activity, FileText, CalendarCheck } from 'lucide-react';

const modules = [
  { href: '/employees', label: 'Employees', desc: 'Data dan manajemen karyawan' },
  { href: '/employees/organization', label: 'Organization', desc: 'Departemen, posisi, dan struktur organisasi' },
  { href: '/attendance', label: 'Attendance', desc: 'Absensi dan presensi harian' },
  { href: '/leaves', label: 'Leave', desc: 'Cuti, izin, dan saldo cuti' },
  { href: '/payroll', label: 'Payroll', desc: 'Periode dan perhitungan gaji' },
  { href: '/payslips', label: 'Payslips', desc: 'Riwayat slip gaji' },
  { href: '/expenses', label: 'Expenses', desc: 'Klaim pengeluaran dan reimbursment' },
  { href: '/loans', label: 'Loans', desc: 'Pinjaman karyawan dan cicilan' },
  { href: '/benefits', label: 'Benefits', desc: 'Tunjangan dan benefit' },
  { href: '/assets', label: 'Assets', desc: 'Inventaris aset perusahaan' },
  { href: '/goals', label: 'Goals & OKRs', desc: 'Tujuan dan hasil kerja' },
  { href: '/reviews', label: 'Reviews', desc: 'Penilaian kinerja' },
  { href: '/cycles', label: 'Review Cycles', desc: 'Siklus review kinerja' },
  { href: '/jobs', label: 'Job Postings', desc: 'Lowongan pekerjaan' },
  { href: '/candidates', label: 'Candidates', desc: 'Kandidat dan pelamar' },
  { href: '/applications', label: 'Applications', desc: 'Lamaran masuk' },
  { href: '/learning/trainings', label: 'Learning', desc: 'Pelatihan dan sertifikasi' },
  { href: '/resignations', label: 'Resignations', desc: 'Resignasi dan offboarding' },
  { href: '/profile', label: 'My Profile', desc: 'Data pribadi dan kepegawaian' },
  { href: '/admin/roles', label: 'Admin', desc: 'Role, tenant, dan audit log' },
];

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: activities = [] } = useRecentActivity();

  const stats = [
    { icon: CalendarCheck, value: data?.attendance?.isClockedIn ? '✓' : '—', label: 'Attendance', color: data?.attendance?.isClockedIn ? 'text-green-500' : 'text-muted-foreground' },
    { icon: LayoutDashboard, value: data?.pendingApprovals?.total ?? '—', label: 'Pending Approvals', color: 'text-primary' },
    { icon: FileText, value: data?.recentPayslips?.length ?? 0, label: 'Payslips', color: 'text-primary' },
    { icon: Activity, value: data?.leaveBalances?.length ?? 0, label: 'Leave Types', color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Beranda</h1>
        <p className="text-sm text-muted-foreground">Ringkasan sistem HR</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{s.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.leaveBalances && data.leaveBalances.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Saldo Cuti</h2>
          <div className="flex gap-3 flex-wrap">
            {data.leaveBalances.map((b: any) => (
              <Card key={b.leaveType} className="min-w-[120px]">
                <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{b.available}/{b.totalEntitled}</p>
                   <p className="text-xs text-muted-foreground">{b.leaveType?.name ?? b.leaveType}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {activities.length === 0 && <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>}
            {activities.map((a: any) => (
              <div key={a.id} className="flex justify-between gap-2 py-1.5 text-xs border-b last:border-b-0">
                <span><strong>{a.action}</strong> {a.entity} oleh {a.changedBy}</span>
                <span className="text-muted-foreground whitespace-nowrap">{new Date(a.changedAt).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Payslip Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {(!data?.recentPayslips || data.recentPayslips.length === 0) && (
              <p className="text-sm text-muted-foreground">Belum ada payslip.</p>
            )}
            {data?.recentPayslips?.map((p: any) => (
              <Link key={p.id} href={`/payslips/${p.id}`} className="no-underline">
                <div className="flex justify-between py-2 text-sm border-b last:border-b-0 hover:bg-muted/50">
                  <span className="text-foreground">{p.run?.name}</span>
                  <span className="font-semibold text-foreground">Rp {Number(p.netPay).toLocaleString('id-ID')}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Modul</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((m) => (
            <Link key={m.href} href={m.href} className="no-underline">
              <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mt-0 mb-1">{m.label}</h3>
                  <p className="text-xs text-muted-foreground m-0">{m.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
