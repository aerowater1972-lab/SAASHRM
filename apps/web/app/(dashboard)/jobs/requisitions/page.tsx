'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRequisitions, useCreateRequisition, useUpdateRequisitionStatus } from '@/lib/hooks/recruitment';
import { useDepartments } from '@/lib/hooks/movements';
import { jobRequisitionSchema, type JobRequisitionInput } from '@/lib/schemas/recruitment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  open: 'success',
  draft: 'secondary',
  closed: 'warning',
  cancelled: 'destructive',
};

const priorityVariant: Record<string, 'default' | 'destructive'> = {
  normal: 'default',
  urgent: 'destructive',
};

export default function JobRequisitionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requisitions = [], isLoading, error, refetch } = useRequisitions();
  const { data: departments = [] } = useDepartments();
  const createMutation = useCreateRequisition();
  const updateStatus = useUpdateRequisitionStatus();

  const form = useForm<JobRequisitionInput>({
    resolver: zodResolver(jobRequisitionSchema),
    defaultValues: {
      title: '', departmentId: '', headcount: '1', priority: 'normal',
    },
  });

  async function onSubmit(data: JobRequisitionInput) {
    createMutation.mutate({
      title: data.title,
      departmentId: data.departmentId,
      headcount: parseInt(data.headcount),
      priority: data.priority,
    }, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requisisi Pekerjaan</h1>
          <p className="text-sm text-muted-foreground">Permintaan pengadaan karyawan baru</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Requisisi Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Requisisi Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="req-title">Judul Posisi</Label>
                <Input id="req-title" {...form.register('title')} placeholder="e.g. Senior Developer" />
                {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-dept">Departemen</Label>
                <select id="req-dept" {...form.register('departmentId')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Pilih departemen…</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {form.formState.errors.departmentId && <p className="text-xs text-destructive">{form.formState.errors.departmentId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-headcount">Jumlah Karyawan</Label>
                <Input id="req-headcount" type="number" min={1} {...form.register('headcount')} />
                {form.formState.errors.headcount && <p className="text-xs text-destructive">{form.formState.errors.headcount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-priority">Prioritas</Label>
                <select id="req-priority" {...form.register('priority')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <TableSkeleton rows={5} columns={5} />}

      {!isLoading && !error && requisitions.length === 0 && (
        <EmptyState title="Belum ada requisisi" description="Buat requisisi pertama untuk memulai perekrutan." />
      )}

      {!isLoading && !error && requisitions.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Judul</th>
                    <th className="px-4 py-3 font-medium">Departemen</th>
                    <th className="px-4 py-3 font-medium">Headcount</th>
                    <th className="px-4 py-3 font-medium">Prioritas</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requisitions.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{r.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs">{r.headcount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(priorityVariant[r.priority] || 'default') as any}>{r.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[r.status] || 'secondary') as any}>{r.status.toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: 'open' }, { onSuccess: () => refetch() })}>Buka</Button>
                        )}
                        {r.status === 'open' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: 'closed' }, { onSuccess: () => refetch() })}>Tutup</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
