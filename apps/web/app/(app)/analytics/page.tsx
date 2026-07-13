'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui';

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
  const { data, error, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get<DashboardSummary>('/analytics/dashboard/summary'),
  });

  return (
    <div>
      <h2 className="mt-0">Analytics</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error instanceof Error ? error.message : 'Failed to load'}</div>}
      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 mb-6">
            <Card className="text-center"><div className="text-3xl font-bold">{data.headcount.total}</div><div className="text-xs text-gray-500 dark:text-gray-400">Headcount</div></Card>
            <Card className="text-center"><div className="text-3xl font-bold">{(data.attendance.avgPresence * 100).toFixed(1)}%</div><div className="text-xs text-gray-500 dark:text-gray-400">Presence</div></Card>
            <Card className="text-center"><div className="text-3xl font-bold">{(data.attendance.latePercentage * 100).toFixed(1)}%</div><div className="text-xs text-gray-500 dark:text-gray-400">Late %</div></Card>
            <Card className="text-center"><div className="text-3xl font-bold">Rp {(data.payroll.totalPayroll / 1e6).toFixed(1)}M</div><div className="text-xs text-gray-500 dark:text-gray-400">Total Payroll</div></Card>
            <Card className="text-center"><div className="text-3xl font-bold">Rp {(data.payroll.averageSalary / 1e6).toFixed(1)}M</div><div className="text-xs text-gray-500 dark:text-gray-400">Avg Salary</div></Card>
            <Card className="text-center"><div className="text-3xl font-bold">{(data.turnover.rate * 100).toFixed(1)}%</div><div className="text-xs text-gray-500 dark:text-gray-400">Turnover</div></Card>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4">
            <Card className="w-full"><h4 className="m-0 mb-3">Headcount by Department</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={toChartData(data.headcount.byDepartment)} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3498db" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="w-full"><h4 className="m-0 mb-3">Payroll by Department</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={toChartData(data.payroll.byDepartment)} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip formatter={(v: any) => `Rp ${Number(v).toLocaleString('id-ID')}`} />
                  <Bar dataKey="value" fill="#9b59b6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="w-full"><h4 className="m-0 mb-3">Leave Utilization</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={toChartData(data.leave.byType)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {toChartData(data.leave.byType).map((_: any, i: any) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="w-full"><h4 className="m-0 mb-3">Recruitment Funnel</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={toChartData(data.recruitment.byStage)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 mb-0">Avg time to hire: {data.recruitment.averageTimeToHire?.toFixed(1)} days</p>
            </Card>

            <Card className="w-full"><h4 className="m-0 mb-3">Performance Scores</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={toChartData(data.performance.byScore)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1abc9c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="w-full"><h4 className="m-0 mb-3">Headcount by Status</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={toChartData(data.headcount.byStatus)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {toChartData(data.headcount.byStatus).map((_: any, i: any) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
