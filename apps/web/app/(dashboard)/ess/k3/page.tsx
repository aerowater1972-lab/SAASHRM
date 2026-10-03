'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import { ShieldAlert, Shield, GraduationCap, CheckCircle, XCircle, AlertTriangle, ChevronLeft } from 'lucide-react';

export default function EssK3Page() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [ackId, setAckId] = useState<string | null>(null);

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['ess', 'k3-profile'],
    queryFn: () => api.get<any>('/ess/dashboard'),
  });

  const { data: spHistory = [] } = useQuery({
    queryKey: ['ess', 'disciplinary-history'],
    queryFn: () => api.get<any[]>('/ess/disciplinary-history'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/disciplinary-cases/${id}/acknowledge`, { notes: 'Diakui melalui ESS' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ess'] }); setAckId(null); toast('SP berhasil diakui', 'success'); },
    onError: () => toast('Gagal mengakui SP', 'error'),
  });

  const k3 = (profile as any)?.k3Profile;
  const pendingSp = spHistory.filter((c: any) => c.status === 'APPROVED' && !c.acknowledgedAt);

  if (isLoading) return <div className="mx-auto max-w-md space-y-4 p-4"><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-32 w-full rounded-xl" /></div>;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-md pb-20">
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">K3 & Disiplin</h1>
      </div>

      {pendingSp.length > 0 && (
        <div className="p-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />SP Menunggu Acknowledgment</h3>
            {pendingSp.map((c: any) => (
              <div key={c.id} className="bg-white rounded p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={c.spLevel === 'SP3' ? 'destructive' : c.spLevel === 'SP2' ? 'secondary' : 'success'}>{c.spLevel}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(c.issuedDate).toLocaleDateString('id-ID')}</span>
                </div>
                <p className="text-sm mb-2">{c.description}</p>
                {c.violationCategory && <Badge variant="outline" className="text-xs">{c.violationCategory.name}</Badge>}
                <div className="mt-3">
                  {ackId === c.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acknowledgeMutation.mutate(c.id)} disabled={acknowledgeMutation.isPending}>
                        <CheckCircle className="mr-1 h-4 w-4" />Konfirmasi
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAckId(null)}>Batal</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="default" onClick={() => setAckId(c.id)}>
                      <CheckCircle className="mr-1 h-4 w-4" />Akui SP
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 p-4">
        {k3 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" />Pelatihan K3</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">{k3.completedK3Trainings ?? 0} Terselesaikan</Badge>
                <Badge variant="secondary" className="text-xs">{k3.activePpeCount ?? 0} APD Aktif</Badge>
                {k3.activeSp && <Badge variant="destructive" className="text-xs">{k3.activeSp.spLevel}</Badge>}
              </div>
              {k3.recentTrainings?.length > 0 && (
                <div className="space-y-1">
                  {k3.recentTrainings.map((t: any) => (
                    <div key={t.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                      <span>{t.title}</span>
                      <span className="text-xs text-muted-foreground">{new Date(t.startDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Riwayat Surat Peringatan</CardTitle></CardHeader>
          <CardContent>
            {spHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada riwayat SP.</p>
            ) : (
              <div className="space-y-2">
                {spHistory.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={c.spLevel === 'SP3' ? 'destructive' : c.spLevel === 'SP2' ? 'secondary' : 'success'} className="text-[10px]">{c.spLevel}</Badge>
                      <span className="text-xs">{c.description?.slice(0, 60)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(c.issuedDate).toLocaleDateString('id-ID')}</span>
                      {c.acknowledgedAt ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-amber-500" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />APD Aktif</CardTitle></CardHeader>
          <CardContent>
            {k3?.activePpe?.length > 0 ? (
              <div className="space-y-2">
                {k3.activePpe.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                    <span>{p.ppeType}</span>
                    <span className="text-xs text-muted-foreground">{p.expiryDate ? `Kedaluwarsa: ${new Date(p.expiryDate).toLocaleDateString('id-ID')}` : 'Tidak ada masa berlaku'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada APD terdaftar.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
