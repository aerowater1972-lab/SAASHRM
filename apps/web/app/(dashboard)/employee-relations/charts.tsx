'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/**
 * Recharts-heavy section, split into its own chunk via next/dynamic(ssr:false)
 * so the dashboard first-load stays lean.
 */
export default function ErCharts({
  byDepartment,
  accidents,
  nearMisses,
}: {
  byDepartment: Array<{ name: string; rate: number }>;
  accidents: number;
  nearMisses: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Kepatuhan Pelatihan per Departemen</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDepartment} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Bar dataKey="rate" fill="var(--brand-primary, #2563EB)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Distribusi Insiden</CardTitle></CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={[
                { name: 'Kecelakaan', value: accidents, color: '#ef4444' },
                { name: 'Near-Miss', value: nearMisses, color: '#f59e0b' },
              ]} cx="50%" cy="50%" outerRadius={70} label={({ name, value }: any) => `${name}: ${value}`}>
                {[0, 1].map((i) => (
                  <Cell key={i} fill={i === 0 ? '#ef4444' : '#f59e0b'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
