'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType } from '@/lib/hooks/leave';
import { leaveTypeSchema, type LeaveTypeInput } from '@/lib/schemas/leave';
import type { LeaveType } from '@/lib/types';
import { hasPermission } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, AlertCircle } from 'lucide-react';

const defaultValues: LeaveTypeInput = {
  name: '',
  code: '',
  description: '',
  isPaid: true,
  allowNegativeBalance: false,
  requiresDocument: false,
  isBalanceDeducting: true,
  sameDayApproval: false,
  isUnionActivity: false,
  isActive: true,
};

const boolFields: { key: keyof LeaveTypeInput; label: string; hint?: string }[] = [
  { key: 'isPaid', label: 'Dibayar (Paid)' },
  { key: 'isBalanceDeducting', label: 'Memotong saldo cuti', hint: 'Nonaktif = Izin (tidak memotong saldo)' },
  { key: 'allowNegativeBalance', label: 'Boleh saldo minus' },
  { key: 'requiresDocument', label: 'Wajib dokumen' },
  { key: 'sameDayApproval', label: 'Bisa diajukan hari-H (auto-approve)' },
  { key: 'isUnionActivity', label: 'Izin Kegiatan Serikat', hint: 'Hanya untuk pengurus serikat (union officer)' },
];

export default function LeaveTypesAdminPage() {
  const canManage = hasPermission('leave-types:read');
  const { data: leaveTypes = [], isLoading, error: queryError, refetch } = useLeaveTypes();
  const createLeaveType = useCreateLeaveType();
  const updateLeaveType = useUpdateLeaveType();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const form = useForm<LeaveTypeInput>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues,
  });

  async function onSubmit(data: LeaveTypeInput) {
    setError('');
    try {
      if (editId) {
        await updateLeaveType.mutateAsync({ id: editId, data });
      } else {
        await createLeaveType.mutateAsync(data);
      }
      setDialogOpen(false);
      setEditId(null);
      form.reset(defaultValues);
      refetch();
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan tipe cuti');
    }
  }

  function handleEdit(lt: LeaveType) {
    setEditId(lt.id);
    form.reset({
      name: lt.name,
      code: lt.code,
      description: lt.description ?? '',
      isPaid: lt.isPaid ?? true,
      allowNegativeBalance: lt.allowNegativeBalance ?? false,
      maxConsecutiveDays: lt.maxConsecutiveDays ?? undefined,
      requiresDocument: lt.requiresDocument ?? false,
      carryForwardLimit: lt.carryForwardLimit ?? undefined,
      carryForwardExpiry: lt.carryForwardExpiry ?? '',
      genderRestriction: lt.genderRestriction ?? undefined,
      minServiceMonths: lt.minServiceMonths ?? undefined,
      isBalanceDeducting: lt.isBalanceDeducting ?? true,
      sameDayApproval: lt.sameDayApproval ?? false,
      isUnionActivity: lt.isUnionActivity ?? false,
      isActive: lt.isActive ?? true,
    });
    setDialogOpen(true);
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="flex items-center gap-2 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Anda tidak memiliki izin untuk mengelola tipe cuti.
        </Card>
      </div>
    );
  }

  const values = form.watch();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tipe Cuti &amp; Izin</h2>
          <p className="text-sm text-muted-foreground">Kelola jenis cuti/izin, termasuk Izin Kegiatan Serikat.</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) {
              setEditId(null);
              form.reset(defaultValues);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tipe Cuti
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Tipe Cuti' : 'Tambah Tipe Cuti'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input {...form.register('name')} required placeholder="Cuti Tahunan" />
                  {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Kode</Label>
                  <Input {...form.register('code')} required placeholder="CT" />
                  {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Input {...form.register('description')} placeholder="Opsional" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Maks. hari berturut</Label>
                  <Input
                    type="number"
                    {...form.register('maxConsecutiveDays', { setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10) || undefined) })}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min. masa kerja (bln)</Label>
                  <Input
                    type="number"
                    {...form.register('minServiceMonths', { setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10) || 0) })}
                    placeholder="—"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Batas carry-forward</Label>
                  <Input
                    type="number"
                    {...form.register('carryForwardLimit', { setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10) || 0) })}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Batas kedaluwarsa CF</Label>
                  <Input {...form.register('carryForwardExpiry')} placeholder="Q1_NEXT_YEAR" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genderRestriction">Batasan gender</Label>
                <select
                  id="genderRestriction"
                  {...form.register('genderRestriction')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Tidak ada</option>
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                {boolFields.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-3">
                    <div>
                      <Label>{f.label}</Label>
                      {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                    </div>
                    <Switch
                      checked={Boolean(values[f.key])}
                      onCheckedChange={(checked) => form.setValue(f.key, checked)}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <Label>Aktif</Label>
                  <Switch checked={Boolean(values.isActive)} onCheckedChange={(checked) => form.setValue('isActive', checked)} />
                </div>
              </div>

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editId ? 'Simpan Perubahan' : 'Tambah'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(error || queryError) && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error || (queryError as any)?.message}</div>
      )}

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {queryError && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !queryError && leaveTypes.length === 0 && (
        <EmptyState title="Belum ada tipe cuti" description="Tambah tipe cuti untuk memulai." />
      )}

      {!isLoading && !queryError && leaveTypes.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Serikat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leaveTypes as LeaveType[]).map((lt) => (
                <TableRow key={lt.id}>
                  <TableCell className="font-medium">{lt.name}</TableCell>
                  <TableCell className="font-mono text-xs">{lt.code}</TableCell>
                  <TableCell>
                    <Badge variant={lt.isBalanceDeducting === false ? 'secondary' : 'success'}>
                      {lt.isBalanceDeducting === false ? 'Izin' : 'Cuti'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lt.isUnionActivity ? <Badge variant="default">Kegiatan Serikat</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(lt)}>
                      Ubah
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
