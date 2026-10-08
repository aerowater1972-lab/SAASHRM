'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useK3Dashboard, useK3TrainingCompliance, useViolationCategories, useDisciplinaryCases, useIncidentReports, usePpeAssignments } from '@/lib/hooks/employee-relations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableSkeleton, ErrorState } from '@/components/ui/data-states';
import { AlertTriangle, FileText, Shield, Users, TrendingUp, Clock, Activity, GraduationCap, Download } from 'lucide-react';
import { exportCsv } from '@/lib/utils/export-csv';

// Recharts is heavy (~450KB raw) — load charts on demand so the
// dashboard first-load stays within budget.
const ErCharts = dynamic(() => import('./charts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card><CardContent className="h-64"><div className="h-full w-full bg-muted animate-pulse rounded" /></CardContent></Card>
      <Card><CardContent className="h-64"><div className="h-full w-full bg-muted animate-pulse rounded" /></CardContent></Card>
    </div>
  ),
});

const tabs = [
  { href: '/employee-relations', label: 'Dashboard', icon: Activity },
  { href: '/employee-relations/disciplinary-cases', label: 'Surat Peringatan', icon: FileText },
  { href: '/employee-relations/incident-reports', label: 'Insiden Kerja', icon: AlertTriangle },
  { href: '/employee-relations/ppe-assignments', label: 'APD', icon: Shield },
  { href: '/employee-relations/violation-categories', label: 'Kategori Pelanggaran', icon: TrendingUp },
];

export default function EmployeeRelationsPage() {
  const pathname = usePathname();
  const { data: dash, isLoading, error, refetch } = useK3Dashboard();
  const { data: trainingCompliance } = useK3TrainingCompliance();
  const { data: allSp = [] } = useDisciplinaryCases();
  const { data: allIncidents = [] } = useIncidentReports();
  const { data: allPpe = [] } = usePpeAssignments();
  const { data: cats = [] } = useViolationCategories();

  function exportCSV() {
    if (trainingCompliance?.byDepartment) {
      exportCsv(trainingCompliance.byDepartment.map((d: any) => ({ departemen: d.name, total: d.total, selesai: d.completed, tingkatKepatuhan: `${d.rate}%` })), 'k3-compliance-by-dept');
    }
    if (allSp.length > 0) {
      exportCsv(allSp.map((c: any) => ({ employee: c.employee?.fullName ?? '', spLevel: c.spLevel, description: c.description, status: c.status, issuedDate: new Date(c.issuedDate).toLocaleDateString('id-ID') })), 'disciplinary-cases');
    }
    if (allIncidents.length > 0) {
      exportCsv(allIncidents.map((i: any) => ({ employee: i.employee?.fullName ?? '', category: i.category, severity: i.severity, location: i.location, status: i.status, date: new Date(i.incidentDate).toLocaleDateString('id-ID') })), 'incident-reports');
    }
    if (allPpe.length > 0) {
      exportCsv(allPpe.map((p: any) => ({ employee: p.employee?.fullName ?? '', ppeType: p.ppeType, condition: p.condition, status: p.status, assignedDate: new Date(p.assignedDate).toLocaleDateString('id-ID'), expiryDate: p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('id-ID') : '' })), 'ppe-assignments');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${
                pathname === tab.href ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            ><Icon className="h-4 w-4" />{tab.label}</Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard K3 &amp; Employee Relations</h2>
          <p className="text-sm text-muted-foreground">Ringkasan insiden, APD, dan kepatuhan</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>

      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader><CardTitle className="text-sm">&nbsp;</CardTitle></CardHeader><CardContent><div className="h-8 w-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      )}

      {dash && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Insiden</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{dash.totalIncidents}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Kecelakaan</CardTitle>
                <Activity className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{dash.accidents}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Near-Miss</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{dash.nearMisses}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Rasio Near-Miss/Kecelakaan</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{dash.nearMissToAccidentRatio}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Investigasi Terbuka</CardTitle>
                <Users className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{dash.openInvestigations}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pelaporan Terekpose (48h)</CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{dash.pendingAuthorityReport}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">APD Akan Kedaluwarsa</CardTitle>
                <Shield className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{dash.ppeExpiringSoon}</div></CardContent>
            </Card>
          </div>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              Gunakan tab navigasi di atas untuk mengelola Surat Peringatan (SP), laporan insiden kerja,
              assignment APD, dan kategori pelanggaran. Data tersinkronisasi dengan riwayat karyawan untuk
              referensi proses PHK di modul Resignation &amp; Offboarding.
            </p>
          </Card>

          {/* Charts row */}
          {dash && trainingCompliance && (
            <ErCharts
              byDepartment={trainingCompliance.byDepartment}
              accidents={dash.accidents}
              nearMisses={dash.nearMisses}
            />
          )}

          {/* K3 Training Compliance — FR-11 */}
          {trainingCompliance && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Kepatuhan Pelatihan K3
                </CardTitle>
                <span className="text-lg font-bold">{trainingCompliance.overallComplianceRate}%</span>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{trainingCompliance.completedEmployees}/{trainingCompliance.totalActiveEmployees} karyawan</span>
                  <span>{trainingCompliance.pendingEmployees} tertunda</span>
                </div>
                {trainingCompliance.byDepartment.length > 0 && (
                  <div className="space-y-1.5">
                    {trainingCompliance.byDepartment.map((dept) => (
                      <div key={dept.name} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[200px]">{dept.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${dept.rate}%` }} />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">{dept.rate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {trainingCompliance.upcomingTrainings.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Pelatihan mendatang:</p>
                    {trainingCompliance.upcomingTrainings.map((t: any) => (
                      <p key={t.id} className="text-xs">{t.title} — {new Date(t.startDate).toLocaleDateString('id-ID')}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
