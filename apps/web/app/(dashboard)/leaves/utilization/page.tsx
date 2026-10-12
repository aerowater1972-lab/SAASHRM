'use client';

import { useState, useMemo } from 'react';
import { useLeaveUtilization } from '@/lib/hooks/analytics';
import { useDepartments } from '@/lib/hooks/organization';
import { useLeaveTypes } from '@/lib/hooks/leave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import { Download, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

interface LeaveUtilizationData {
  period: { start: string; end: string };
  employeeUtilization: Array<{
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    leaveType: string;
    entitled: number;
    carriedForward: number;
    used: number;
    pending: number;
    available: number;
    utilizationRate: number;
  }>;
  monthlyTrend: Array<{ month: number; totalDays: number; count: number }>;
  departmentUtilization: Array<{
    department: string;
    totalEntitled: number;
    totalUsed: number;
    totalPending: number;
    utilizationRate: number;
    employeeCount: number;
  }>;
}

export default function LeaveUtilizationPage() {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'department' | 'employee' | 'trend'>('department');

  const { data: departments } = useDepartments();
  const { data: leaveTypes } = useLeaveTypes();

  const { data: rawData, isLoading, error, refetch } = useLeaveUtilization({
    startDate: asOfDate,
    endDate: asOfDate,
    departmentId: departmentId || undefined,
  });

  const data = rawData as LeaveUtilizationData | undefined;

  const filteredEmployees = useMemo(() => {
    if (!data?.employeeUtilization) return [];
    let result = data.employeeUtilization;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.leaveType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data?.employeeUtilization, searchQuery]);

  const departmentStats = useMemo(() => {
    if (!data?.departmentUtilization) return [];
    return data.departmentUtilization.map((d) => ({
      name: d.department,
      utilizationRate: d.utilizationRate,
      totalEntitled: d.totalEntitled,
      totalUsed: d.totalUsed,
      employeeCount: d.employeeCount,
    }));
  }, [data?.departmentUtilization]);

  const trendData = useMemo(() => {
    if (!data?.monthlyTrend) return [];
    return data.monthlyTrend.map((m) => ({
      name: MONTH_NAMES[m.month - 1],
      totalDays: Number(m.totalDays),
      count: Number(m.count),
    }));
  }, [data?.monthlyTrend]);

  const topUtilizers = useMemo(() => {
    if (!data?.employeeUtilization) return [];
    return [...data.employeeUtilization]
      .filter((e) => e.utilizationRate > 0)
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 10);
  }, [data?.employeeUtilization]);

  const lowUtilizers = useMemo(() => {
    if (!data?.employeeUtilization) return [];
    return [...data.employeeUtilization]
      .filter((e) => e.utilizationRate < 30 && e.entitled > 0)
      .sort((a, b) => a.utilizationRate - b.utilizationRate)
      .slice(0, 10);
  }, [data?.employeeUtilization]);

  const stats = useMemo(() => {
    if (!data) return { totalEntitled: 0, totalUsed: 0, totalPending: 0, avgUtilization: 0 };
    const totals = data.departmentUtilization.reduce<{ totalEntitled: number; totalUsed: number; totalPending: number }>(
      (acc, d) => ({
        totalEntitled: acc.totalEntitled + d.totalEntitled,
        totalUsed: acc.totalUsed + d.totalUsed,
        totalPending: acc.totalPending + d.totalPending,
      }),
      { totalEntitled: 0, totalUsed: 0, totalPending: 0 },
    );
    const avgUtil = totals.totalEntitled > 0
      ? ((totals.totalUsed + totals.totalPending) / totals.totalEntitled) * 100
      : 0;
    return {
      ...totals,
      avgUtilization: Math.round(avgUtil * 100) / 100,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisasi Cuti</h1>
          <p className="text-sm text-muted-foreground">
            Analisis saldo, penggunaan, dan tren cuti karyawan
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisasi Cuti</h1>
          <p className="text-sm text-muted-foreground">
            Analisis saldo, penggunaan, dan tren cuti karyawan
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="asof" className="text-sm">Periode</Label>
            <Input
              id="asof"
              type="date"
              className="w-40"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="dept" className="text-sm">Departemen</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua departemen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua departemen</SelectItem>
                {departments?.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari karyawan, departemen, tipe cuti..."
              className="pl-8 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error instanceof Error ? error.message : 'Gagal memuat data'} onRetry={refetch} />}

      {!isLoading && data && (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Hak Cuti</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalEntitled)} hari</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Terpakai</p>
                <p className="text-3xl font-bold text-destructive">{formatNumber(stats.totalUsed)} hari</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pending Approval</p>
                <p className="text-3xl font-bold text-amber-600">{formatNumber(stats.totalPending)} hari</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Rata-rata Utilisasi</p>
                <p className="text-3xl font-bold">{stats.avgUtilization.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Utilisasi per Departemen</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentStats} layout="vertical" margin={{ left: 120 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
                    <Bar dataKey="utilizationRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribusi Utilisasi Karyawan</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: '0-30%', value: data?.employeeUtilization?.filter(e => e.utilizationRate < 30).length ?? 0 },
                        { name: '30-50%', value: data?.employeeUtilization?.filter(e => e.utilizationRate >= 30 && e.utilizationRate < 50).length ?? 0 },
                        { name: '50-70%', value: data?.employeeUtilization?.filter(e => e.utilizationRate >= 50 && e.utilizationRate < 70).length ?? 0 },
                        { name: '70-90%', value: data?.employeeUtilization?.filter(e => e.utilizationRate >= 70 && e.utilizationRate < 90).length ?? 0 },
                        { name: '90%+', value: data?.employeeUtilization?.filter(e => e.utilizationRate >= 90).length ?? 0 },
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {['#22c55e', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'].map((c, i) => (<Cell key={i} fill={c} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tren Bulanan ({new Date(asOfDate).getFullYear()})</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData} margin={{ top: 5, right: 20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="totalDays" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Garis biru: Total hari cuti | Garis hijau: Jumlah pengajuan
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Top 10 Utilisasi Tertinggi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead className="text-right">Hak (Hari)</TableHead>
                        <TableHead className="text-right">Terpakai</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Utilisasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topUtilizers.map((e: any) => (
                        <TableRow key={e.employeeId}>
                          <TableCell className="font-medium">{e.employeeName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{e.department}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(e.entitled + e.carriedForward)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatNumber(e.used)}</TableCell>
                          <TableCell className="text-right text-amber-600">{formatNumber(e.pending)}</TableCell>
                          <TableCell className="text-right font-bold">{e.utilizationRate.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top 10 Utilisasi Terendah (Potensi Expired)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead className="text-right">Hak (Hari)</TableHead>
                        <TableHead className="text-right">Terpakai</TableHead>
                        <TableHead className="text-right">Tersedia</TableHead>
                        <TableHead className="text-right">Utilisasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowUtilizers.map((e: any) => (
                        <TableRow key={e.employeeId}>
                          <TableCell className="font-medium">{e.employeeName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{e.department}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(e.entitled + e.carriedForward)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatNumber(e.used)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatNumber(e.available)}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{e.utilizationRate.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Detail Utilisasi per Karyawan</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="search" className="text-sm">Cari</Label>
                <Input
                  id="search"
                  placeholder="Filter karyawan..."
                  className="w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIK</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Tipe Cuti</TableHead>
                      <TableHead className="text-right">Hak</TableHead>
                      <TableHead className="text-right">Bawa Fwd</TableHead>
                      <TableHead className="text-right">Terpakai</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Tersedia</TableHead>
                      <TableHead className="text-right">Utilisasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((e: any) => (
                      <TableRow key={`${e.employeeId}-${e.leaveType}`}>
                        <TableCell>{e.employeeCode}</TableCell>
                        <TableCell className="font-medium">{e.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{e.department}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{e.leaveType}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(e.entitled + e.carriedForward)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatNumber(e.carriedForward)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatNumber(e.used)}</TableCell>
                        <TableCell className="text-right text-amber-600">{formatNumber(e.pending)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatNumber(e.available)}</TableCell>
                        <TableCell className="text-right font-bold">
                          <Badge
                            variant={
                              e.utilizationRate >= 90 ? 'destructive' :
                              e.utilizationRate >= 70 ? 'secondary' :
                              e.utilizationRate >= 30 ? 'default' : 'success'
                            }
                          >
                            {e.utilizationRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && !data && <EmptyState title="Data tidak tersedia" description="Belum ada data utilisasi cuti untuk periode ini." />}
    </div>
  );
}
