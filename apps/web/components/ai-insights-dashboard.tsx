/** AI-05: AI Insights Dashboard Widget */
import { useDisengagement, useReadiness, useDepartmentHealth, useRiskTrend } from '@/lib/hooks/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ErrorState, PageSkeleton } from '@/components/ui/data-states';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AiSignal {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: string;
  factors: Array<{ factor: string; impact: number; description: string }>;
  recommendation: string;
}

interface AiReadiness {
  employeeId: string;
  employeeName: string;
  readinessScore: number;
  readinessLevel: string;
}

interface AiInsightsDashboardProps {
  tenantId: string;
}

function bandVariant(band: string) {
  const m: Record<string, string> = { CRITICAL: 'destructive', HIGH: 'destructive', MEDIUM: 'secondary', LOW: 'success', READY: 'success', PRIORITY: 'default', SOON: 'secondary', NOT_READY: 'secondary' };
  return <Badge variant={(m[band] || 'secondary') as any}>{band}</Badge>;
}

function asArray(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const cand = o.data ?? o.signals ?? o.readiness ?? o.items;
    if (Array.isArray(cand)) return cand;
    if (cand && typeof cand === 'object') {
      const inner = cand as Record<string, unknown>;
      const innerCand = inner.signals ?? inner.readiness ?? inner.items;
      if (Array.isArray(innerCand)) return innerCand;
    }
  }
  return [];
}

export function AiInsightsDashboard({ tenantId }: AiInsightsDashboardProps) {
  const { data: signals, isLoading: loading1, error: error1 } = useDisengagement({ tenantId });
  const { data: readiness, isLoading: loading2, error: error2 } = useReadiness({ tenantId });
  const { data: deptHealth = [] } = useDepartmentHealth();
  const { data: trend = [] } = useRiskTrend(6);

  const hasError = error1 || error2;
  const isLoading = loading1 || loading2;

  if (isLoading) return <PageSkeleton />;
  if (hasError) return <ErrorState message={(error1 as Error)?.message || (error2 as Error)?.message || 'Gagal memuat AI insights'} />;

  const riskEmployees = asArray(signals) as AiSignal[];
  const readyScores = asArray(readiness) as AiReadiness[];

  const topRisk = [...riskEmployees].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 10);
  const criticalCount = riskEmployees.filter((s) => s.riskLevel === 'CRITICAL').length;
  const highCount = riskEmployees.filter((s) => s.riskLevel === 'HIGH').length;
  const readyCount = readyScores.filter((s) => s.readinessLevel === 'READY' || s.readinessLevel === 'PRIORITY').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-destructive">{criticalCount}</p><p className="text-xs text-muted-foreground">Critical Risk</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{highCount}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-success">{readyCount}</p><p className="text-xs text-muted-foreground">Ready / Priority</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Top 10 Risk Employees (Disengagement)</CardTitle></CardHeader>
        <CardContent>
          {topRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada sinyal disengagement yang terdeteksi.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Faktor Utama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRisk.map((s) => (
                    <TableRow key={s.employeeId}>
                      <TableCell>{s.employeeName ?? s.employeeId}</TableCell>
                      <TableCell>{typeof s.riskScore === 'number' ? s.riskScore.toFixed(2) : '-'}</TableCell>
                      <TableCell>{bandVariant(s.riskLevel)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(s.factors ?? []).slice(0, 3).map((f) => f.factor).join('; ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-05: Department Health Score */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Department Health Score</CardTitle></CardHeader>
        <CardContent>
          {deptHealth.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data departemen.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Avg Risk</TableHead>
                    <TableHead>Headcount</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>High</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deptHealth as any[]).map((d) => (
                    <TableRow key={d.departmentId}>
                      <TableCell>{d.departmentName}</TableCell>
                      <TableCell>{bandVariant(d.band === 'HEALTHY' ? 'LOW' : d.band === 'AT_RISK' ? 'CRITICAL' : 'MEDIUM')} {d.healthScore}</TableCell>
                      <TableCell>{typeof d.avgRiskScore === 'number' ? d.avgRiskScore.toFixed(2) : '-'}</TableCell>
                      <TableCell>{d.headcount}</TableCell>
                      <TableCell className="text-destructive">{d.criticalCount}</TableCell>
                      <TableCell>{d.highCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-05: Risk Trend (6 bulan) */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Risk Trend (6 Bulan)</CardTitle></CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data tren.</p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend as any[]} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="period" fontSize={12} />
                  <YAxis fontSize={12} domain={[0, 1]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgRisk" name="Avg Risk" stroke="#e74c3c" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="highRiskCount" name="High-risk count" stroke="#f39c12" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


