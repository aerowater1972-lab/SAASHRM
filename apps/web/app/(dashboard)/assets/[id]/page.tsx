'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAsset } from '@/lib/hooks/benefits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Briefcase, User } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  AVAILABLE: 'success',
  ASSIGNED: 'warning',
  MAINTENANCE: 'destructive',
  RETIRED: 'secondary',
  LOST: 'destructive',
};

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: asset, isLoading, error, refetch } = useAsset(params.id as string);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!asset) return <p className="text-muted-foreground">Aset tidak ditemukan</p>;

  const ad = asset as any;
  const activeAssignment = ad.assignments?.find((x: any) => !x.returnedAt);

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{ad.name}</CardTitle>
              </div>
              <Badge variant={(statusVariant[ad.status] || 'secondary') as any}>{ad.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Kode</p>
                <p className="font-mono text-xs">{ad.code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kategori</p>
                <Badge variant="secondary" className="text-[10px]">{ad.category}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Merek</p>
                <p>{ad.brand || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p>{ad.model || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="font-mono text-xs">{ad.serialNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lokasi</p>
                <p>{ad.location || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tanggal Beli</p>
                <p>{ad.purchaseDate ? new Date(ad.purchaseDate).toLocaleDateString('id-ID') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Harga Beli</p>
                <p>{ad.purchasePrice ? `Rp ${Number(ad.purchasePrice).toLocaleString('id-ID')}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Garansi</p>
                <p>{ad.warrantyExpiry ? new Date(ad.warrantyExpiry).toLocaleDateString('id-ID') : '—'}</p>
              </div>
            </div>
            {ad.notes && <p className="text-xs text-muted-foreground mt-3 italic">{ad.notes}</p>}
          </CardContent>
        </Card>

        {activeAssignment && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" /> Ditugaskan Ke
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{activeAssignment.employee?.fullName}</p>
              <p className="text-xs text-muted-foreground">
                Sejak {new Date(activeAssignment.assignedAt).toLocaleDateString('id-ID')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Riwayat Penugasan ({ad.assignments?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(!ad.assignments || ad.assignments.length === 0) ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat penugasan.</p>
          ) : (
            <div className="divide-y">
              {ad.assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium">{a.employee?.fullName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(a.assignedAt).toLocaleDateString('id-ID')}
                      {a.returnedAt ? ` → ${new Date(a.returnedAt).toLocaleDateString('id-ID')}` : ' (Aktif)'}
                    </span>
                  </div>
                  {a.notes && <span className="text-xs text-muted-foreground">{a.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
