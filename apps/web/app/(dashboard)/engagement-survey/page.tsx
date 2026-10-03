'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEngagementSurveys, useDeleteEngagementSurvey } from '@/lib/hooks/use-engagement-survey';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, ClipboardList, BarChart3, Trash2, Eye } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  CLOSED: 'info',
  ARCHIVED: 'destructive',
};

const typeLabel: Record<string, string> = {
  ENPS: 'eNPS',
  PULSE: 'Pulse',
  CUSTOM: 'Kustom',
};

export default function EngagementSurveyListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useEngagementSurveys({ page, limit: 20 });
  const deleteMutation = useDeleteEngagementSurvey();

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;

  const surveys = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  async function handleDelete(id: string) {
    if (!confirm('Hapus survey ini?')) return;
    try { await deleteMutation.mutateAsync(id); } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engagement Survey</h1>
          <p className="text-sm text-muted-foreground">Kelola survey keterlibatan karyawan</p>
        </div>
        <Button onClick={() => router.push('/engagement-survey/new')}>
          <Plus className="mr-2 h-4 w-4" /> Survey Baru
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Daftar Survey</CardTitle></CardHeader>
        <CardContent>
          {surveys.length === 0 ? (
            <EmptyState description="Belum ada survey. Klik tombol Survey Baru untuk membuat." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anonim</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Respon</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabel[s.type] || s.type}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant[s.status] || 'secondary'}>{s.status}</Badge></TableCell>
                      <TableCell>{s.isAnonymous ? 'Ya' : 'Tidak'}</TableCell>
                      <TableCell className="text-xs">{new Date(s.startDate).toLocaleDateString('id-ID')} - {new Date(s.endDate).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="text-right">{s._count?.responses ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/engagement-survey/${s.id}/results`)} title="Hasil"><BarChart3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/engagement-survey/${s.id}/action-items`)} title="Action Items"><ClipboardList className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/engagement-survey/new?id=${s.id}`)} title="Edit"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Hapus"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Selanjutnya</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
