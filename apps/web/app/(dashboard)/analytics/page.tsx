'use client';

import { useDashboardSummary } from '@/lib/hooks/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState, PageSkeleton } from '@/components/ui/data-states';

interface DashboardSummary {
  headcount: { total: number; byDepartment: Record<string, number>; byStatus: Record<string, number>; byGrade: Record<string, number> };
  attendance: { avgPresence: number; latePercentage: number; absentPercentage: number };
  leave: { totalUsed: number; byType: Record<string, number> };
  payroll: { totalPayroll: number; averageSalary: number; byDepartment: Record<string, number> };
  recruitment: { byStage: Record<string, number>; averageTimeToHire: number };
  performance: { byScore: Record<string, number> };
  turnover: { rate: number };
}

const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

function toChartData(obj: Record<string, number> | undefined) {
  if (!obj) return [];
  return Object.entries(obj).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
}

export default function AnalyticsPage() {
  const { data: raw, error, isLoading } = useDashboardSummary();
  const data = raw as DashboardSummary | undefined;

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Gagal memuat data'} />;
  if (!data) return <EmptyState title="Data tidak tersedia" description="Belum ada data analitik untuk ditampilkan." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Ringkasan dan analisis data HR</p>
      </div>

      {data && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{data.headcount.total}</p><p className="text-xs text-muted-foreground">Headcount</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{(data.attendance.avgPresence * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Presence</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{(data.attendance.latePercentage * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Late %</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">Rp {(data.payroll.totalPayroll / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Total Payroll</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">Rp {(data.payroll.averageSalary / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Avg Salary</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{(data.turnover.rate * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Turnover</p></CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Headcount by Department</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={toChartData(data.headcount.byDepartment)} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Payroll by Department</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={toChartData(data.payroll.byDepartment)} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip formatter={(v: any) => `Rp ${Number(v).toLocaleString('id-ID')}`} />
                    <Bar dataKey="value" fill="#9b59b6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Leave Utilization</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={toChartData(data.leave.byType)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {toChartData(data.leave.byType).map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recruitment Funnel</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={toChartData(data.recruitment.byStage)}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">Avg time to hire: {data.recruitment.averageTimeToHire?.toFixed(1)} days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Performance Scores</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={toChartData(data.performance.byScore)}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Headcount by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={toChartData(data.headcount.byStatus)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {toChartData(data.headcount.byStatus).map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
