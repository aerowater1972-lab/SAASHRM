'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '@/lib/hooks/attendance';
import { shiftSchema, type ShiftInput } from '@/lib/schemas/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface Shift {
  id: string; name: string; code: string;
  startTime: string; endTime: string;
  toleranceMinutes?: number; graceMinutes?: number;
  status: string;
}

const defaultShiftValues: ShiftInput = {
  name: '', code: '', startTime: '', endTime: '',
  toleranceMinutes: 0, graceMinutes: 0,
};

export default function ShiftsPage() {
  const pathname = usePathname();
  const { data: shifts = [], isLoading, error: queryError, refetch } = useShifts();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const form = useForm<ShiftInput>({
    resolver: zodResolver(shiftSchema),
    defaultValues: defaultShiftValues,
  });

  async function onSubmit(data: ShiftInput) {
    setError('');
    try {
      if (editId) { await updateShift.mutateAsync({ id: editId, data }); } else { await createShift.mutateAsync(data); }
      setDialogOpen(false); setEditId(null); form.reset(defaultShiftValues);
      refetch();
    } catch (e: any) { setError(e.message); }
  }

  function handleEdit(s: Shift) {
    setEditId(s.id);
    form.reset({
      name: s.name, code: s.code, startTime: s.startTime, endTime: s.endTime,
      toleranceMinutes: Number(s.toleranceMinutes || 0), graceMinutes: Number(s.graceMinutes || 0),
    });
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus shift ini?')) return;
    try { await deleteShift.mutateAsync(id); refetch(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2">
        {[
          { href: '/attendance', label: 'Absensi' },
          { href: '/attendance/overtime', label: 'Lembur' },
          { href: '/attendance/shifts', label: 'Shift' },
        ].map((tab) => (
          <Link key={tab.href} href={tab.href}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${
              pathname === tab.href ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >{tab.label}</Link>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Shift</h2>
          <p className="text-sm text-muted-foreground">Kelola jadwal shift karyawan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); form.reset(defaultShiftValues); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Shift</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit Shift' : 'Tambah Shift'}</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input {...form.register('name')} required placeholder="Morning Shift" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Kode</Label>
                <Input {...form.register('code')} required placeholder="MORNING" />
                {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" {...form.register('startTime')} required />
                  {form.formState.errors.startTime && <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" {...form.register('endTime')} required />
                  {form.formState.errors.endTime && <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tolerance (min)</Label>
                  <Input type="number" {...form.register('toleranceMinutes', { setValueAs: (v) => (v === '' ? 0 : parseInt(v, 10) || 0) })} />
                </div>
                <div className="space-y-2">
                  <Label>Grace (min)</Label>
                  <Input type="number" {...form.register('graceMinutes', { setValueAs: (v) => (v === '' ? 0 : parseInt(v, 10) || 0) })} />
                </div>
              </div>
              <Button type="submit">{editId ? 'Update' : 'Create'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(error || queryError) && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error || (queryError as any)?.message}</div>}

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {queryError && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !queryError && shifts.length === 0 && (
        <EmptyState title="Belum ada shift" description="Tambah shift untuk memulai." />
      )}

      {!isLoading && !queryError && shifts.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="text-muted-foreground">{s.startTime} – {s.endTime}</TableCell>
                  <TableCell><Badge variant={s.status === 'ACTIVE' ? 'success' : 'secondary'}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>Ubah</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>Hapus</Button>
                    </div>
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
