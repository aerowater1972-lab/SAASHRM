'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useManpowerPlans, useDeleteManpowerPlan } from '@/lib/hooks/use-manpower-planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, Eye, Send, CheckCircle, Trash2, BarChart3, ClipboardList } from 'lucide-react';

const statusVariant: Record<string, 'secondary' | 'warning' | 'info' | 'success' | 'destructive'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'warning',
  HR_REVIEW: 'info',
  FINANCE_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

export default function ManpowerPlanningListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useManpowerPlans({ page, limit: 20 });
  const deleteMutation = useDeleteManpowerPlan();

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;

  const plans = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  async function handleDelete(id: string) {
    if (!confirm('Hapus rencana ini?')) return;
    try { await deleteMutation.mutateAsync(id); } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manpower Planning</h1>
          <p className="text-sm text-muted-foreground">Kelola perencanaan tenaga kerja</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/manpower-planning/compilation')}>
            <ClipboardList className="mr-2 h-4 w-4" /> Kompilasi
          </Button>
          <Button variant="outline" onClick={() => router.push('/manpower-planning/plan-vs-actual')}>
            <BarChart3 className="mr-2 h-4 w-4" /> Plan vs Actual
          </Button>
          <Button onClick={() => router.push('/manpower-planning/new')}>
            <Plus className="mr-2 h-4 w-4" /> Rencana Baru
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Daftar Rencana</CardTitle></CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <EmptyState description="Belum ada rencana. Klik tombol Rencana Baru untuk membuat." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Item</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.department?.name || p.departmentId}</TableCell>
                      <TableCell>{p.period}</TableCell>
                      <TableCell><Badge variant={statusVariant[p.status] || 'secondary'}>{p.status}</Badge></TableCell>
                      <TableCell className="text-right">{p._count?.items ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/manpower-planning/${p.id}`)} title="Detail"><Eye className="h-4 w-4" /></Button>
                          {p.status === 'DRAFT' && (
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/manpower-planning/${p.id}/submit`)} title="Submit"><Send className="h-4 w-4" /></Button>
                          )}
                          {(p.status === 'HR_REVIEW' || p.status === 'FINANCE_REVIEW') && (
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/manpower-planning/${p.id}/approve`)} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Hapus"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
