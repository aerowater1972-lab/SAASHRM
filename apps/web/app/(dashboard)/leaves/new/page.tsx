'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getToken } from '@/lib/api';
import { useLeaveTypes, useCreateLeaveRequest } from '@/lib/hooks/leave';
import { leaveRequestSchema, type LeaveRequestInput } from '@/lib/schemas/leave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageSkeleton } from '@/components/ui/data-states';

interface LeaveType { id: string; name: string; code: string }

export default function NewLeavePage() {
  const router = useRouter();
  const { data: leaveTypes = [], isLoading } = useLeaveTypes();
  const createLeaveRequest = useCreateLeaveRequest();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const form = useForm<LeaveRequestInput>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { leaveTypeId: '', startDate: '', endDate: '', reason: '' },
  });

  const employeeId = (() => { try { const t = getToken(); if (!t) return null; return JSON.parse(atob(t.split('.')[1])).employeeId; } catch { return null; } })();

  if (isLoading) return <PageSkeleton />;

  if (!employeeId) {
    return (
      <div className="space-y-4">
        <Link href="/leaves" className="text-sm text-muted-foreground hover:text-foreground">&larr; Kembali</Link>
        <Card><CardContent className="p-6"><p className="text-muted-foreground">Akun Anda tidak memiliki profil karyawan.</p></CardContent></Card>
      </div>
    );
  }

  async function onSubmit(data: LeaveRequestInput) {
    if (new Date(data.endDate) < new Date(data.startDate)) {
      form.setError('endDate', { message: 'Tanggal selesai harus setelah tanggal mulai' });
      return;
    }
    setSaving(true); setError('');
    try {
      const req = await createLeaveRequest.mutateAsync(data);
      router.push(`/leaves/${req.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/leaves" className="text-sm text-muted-foreground hover:text-foreground">&larr; Kembali</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengajuan Cuti Baru</h1>
        <p className="text-sm text-muted-foreground">Ajukan cuti atau izin baru</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-md">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Cuti</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Cuti</Label>
              <Controller
                control={form.control}
                name="leaveTypeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis cuti" /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((lt: LeaveType) => (
                        <SelectItem key={lt.id} value={lt.id}>{lt.name} ({lt.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.leaveTypeId && <p className="text-xs text-destructive">{form.formState.errors.leaveTypeId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Tanggal Mulai" type="date" {...form.register('startDate')} />
              <Input label="Tanggal Selesai" type="date" {...form.register('endDate')} />
            </div>
            {form.formState.errors.startDate && <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>}
            {form.formState.errors.endDate && <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>}

            <div className="space-y-2">
              <Label>Alasan</Label>
              <textarea aria-label="Alasan"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('reason')}
              />
              {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
            </div>

            <Button type="submit" disabled={saving}>{saving ? 'Mengirim…' : 'Ajukan'}</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
