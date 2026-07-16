'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMovements, useCreateMovement, useApproveMovement, useRejectMovement, useDepartments, usePositions, useEmployees } from '@/lib/hooks/movements';
import { createMovementSchema, type CreateMovementInput } from '@/lib/schemas/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const typeLabels: Record<string, string> = { promotion: 'Promosi', transfer: 'Mutasi', mutation: 'Alih Tugas' };

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'destructive',
};

export default function MovementsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: movements = [], isLoading, error, refetch } = useMovements();
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateMovement();
  const approveMutation = useApproveMovement();
  const rejectMutation = useRejectMovement();

  const form = useForm<CreateMovementInput>({ resolver: zodResolver(createMovementSchema) });

  async function onSubmit(data: CreateMovementInput) {
    createMutation.mutate(
      {
        employeeId: data.employeeId,
        type: data.type,
        newPositionId: data.newPositionId || undefined,
        newDepartmentId: data.newDepartmentId || undefined,
        effectiveDate: data.effectiveDate,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset();
          refetch();
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mutasi Karyawan</h1>
          <p className="text-sm text-muted-foreground">Kelola promosi, mutasi, dan alih tugas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Mutasi Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Mutasi Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mv-employee">Karyawan</Label>
                <select id="mv-employee" {...form.register('employeeId')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Pilih karyawan…</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeId})</option>)}
                </select>
                {form.formState.errors.employeeId && (
                  <p className="text-xs text-destructive">{form.formState.errors.employeeId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mv-type">Tipe</Label>
                <select id="mv-type" {...form.register('type')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="promotion">Promosi</option>
                  <option value="transfer">Mutasi</option>
                  <option value="mutation">Alih Tugas</option>
                </select>
                {form.formState.errors.type && (
                  <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mv-position">Posisi Baru</Label>
                <select id="mv-position" {...form.register('newPositionId')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Posisi sama</option>
                  {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mv-dept">Departemen Baru</Label>
                <select id="mv-dept" {...form.register('newDepartmentId')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Departemen sama</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mv-date">Tanggal Efektif</Label>
                <Input id="mv-date" type="date" {...form.register('effectiveDate')} />
                {form.formState.errors.effectiveDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.effectiveDate.message}</p>
                )}
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <TableSkeleton rows={5} columns={6} />}

      {!isLoading && !error && movements.length === 0 && (
        <EmptyState title="Belum ada mutasi" description="Buat mutasi pertama untuk memulai." />
      )}

      {!isLoading && !error && movements.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Karyawan</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Posisi Baru</th>
                    <th className="px-4 py-3 font-medium">Dept. Baru</th>
                    <th className="px-4 py-3 font-medium">Efektif</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{m.employee?.fullName || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{typeLabels[m.type] || m.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.newPosition?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.newDepartment?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(m.effectiveDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[m.status] || 'secondary') as any}>{m.status.toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {m.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(m.id, { onSuccess: () => refetch() })}>Setujui</Button>
                            <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(m.id, { onSuccess: () => refetch() })}>Tolak</Button>
                          </div>
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
