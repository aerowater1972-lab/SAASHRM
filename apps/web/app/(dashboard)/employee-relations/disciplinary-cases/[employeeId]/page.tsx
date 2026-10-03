'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchDisciplinaryHistory, fetchEmployeeK3Profile } from '@/lib/api/employee-relations';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, GraduationCap, Shield } from 'lucide-react';

const statusIcon = (s: string) => {
  switch (s) {
    case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'ACKNOWLEDGED': return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'DRAFT': return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'EXPIRED': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function EmployeeSpHistoryPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;
  const { data: history = [], isLoading, error, refetch } = useQuery({
    queryKey: ['disciplinary-history', employeeId],
    queryFn: () => fetchDisciplinaryHistory(employeeId),
    enabled: !!employeeId,
  });
  const { data: k3profile } = useQuery({
    queryKey: ['k3-profile', employeeId],
    queryFn: () => fetchEmployeeK3Profile(employeeId),
    enabled: !!employeeId,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/employee-relations/disciplinary-cases" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      </div>
      <div>
        <h2 className="text-xl font-semibold">Riwayat SP Karyawan</h2>
        <p className="text-sm text-muted-foreground font-mono">{employeeId}</p>
      </div>

      {k3profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pelatihan K3</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k3profile.completedK3Trainings}</div>
              <p className="text-xs text-muted-foreground">sesi terselesaikan</p>
              {k3profile.trainings?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {k3profile.trainings.slice(0, 3).map((t: any) => (
                    <p key={t.id} className="text-xs truncate">{t.title}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">APD Aktif</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k3profile.activePpeCount}</div>
              <p className="text-xs text-muted-foreground">item terdaftar</p>
              {k3profile.activePpe?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {k3profile.activePpe.map((p: any) => (
                    <p key={p.id} className="text-xs truncate">
                      {p.ppeType}{p.expiryDate ? ` (exp: ${new Date(p.expiryDate).toLocaleDateString()})` : ''}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && <TableSkeleton rows={4} columns={3} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && history.length === 0 && (
        <EmptyState title="Belum ada riwayat SP" description="Karyawan ini belum memiliki Surat Peringatan." />
      )}

      {!isLoading && !error && history.length > 0 && (
        <div className="relative pl-6 space-y-0">
          {history.map((c: any, idx: number) => (
            <div key={c.id} className="relative pb-6 last:pb-0">
              {idx < history.length - 1 && (
                <div className="absolute left-[5px] top-3 bottom-0 w-0.5 bg-border" />
              )}
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{statusIcon(c.status)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={c.spLevel === 'SP3' ? 'destructive' : c.spLevel === 'SP2' ? 'secondary' : 'success'}>{c.spLevel}</Badge>
                    <Badge variant={c.status === 'ACKNOWLEDGED' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </div>
                  <p className="text-sm">{c.description}</p>
                  <div className="text-xs text-muted-foreground flex gap-3">
                    <span>{new Date(c.issuedDate).toLocaleDateString()}</span>
                    {c.violationCategory && <span>Kategori: {c.violationCategory.name}</span>}
                    {c.acknowledgedAt && <span>Acknowledged: {new Date(c.acknowledgedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
