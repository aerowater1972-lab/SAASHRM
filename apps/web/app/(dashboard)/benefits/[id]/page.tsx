'use client';

import { useParams, useRouter } from 'next/navigation';
import { useBenefit } from '@/lib/hooks/benefits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Gift } from 'lucide-react';

export default function BenefitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: benefit, isLoading, error, refetch } = useBenefit(params.id as string);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!benefit) return <p className="text-muted-foreground">Benefit tidak ditemukan</p>;

  const b = benefit as any;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{b.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kode</span>
              <span className="font-mono text-xs">{b.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipe</span>
              <Badge variant="secondary" className="text-[10px]">{b.type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={b.isActive ? 'success' : 'secondary'}>{b.isActive ? 'Aktif' : 'Tidak Aktif'}</Badge>
            </div>
            {b.amount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-semibold">Rp {Number(b.amount).toLocaleString('id-ID')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {b.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Deskripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{b.description}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Karyawan Terdaftar ({b.employeeBenefits?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(!b.employeeBenefits || b.employeeBenefits.length === 0) ? (
            <p className="text-sm text-muted-foreground">Belum ada karyawan terdaftar.</p>
          ) : (
            <div className="divide-y">
              {b.employeeBenefits.map((eb: any) => (
                <div key={eb.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{eb.employee?.fullName || '—'}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={eb.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">{eb.status}</Badge>
                    {eb.effectiveDate && (
                      <span className="text-xs text-muted-foreground">{new Date(eb.effectiveDate).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
