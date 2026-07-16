'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useLeaveRequests,
  useLeaveTypes,
  useCreateLeaveRequest,
  useCancelLeaveRequest,
} from '@/lib/hooks/leave';
import { leaveRequestSchema, type LeaveRequestInput } from '@/lib/schemas/leave';
import type { LeaveRequest, LeaveType, RequestStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import {
  ChevronLeft,
  Clock,
  CalendarDays,
  Wallet,
  User,
  Bell,
  Plus,
  ChevronRight,
} from 'lucide-react';

const bottomNav = [
  { href: '/ess', label: 'Home', icon: Clock, active: false },
  { href: '/ess/leave', label: 'Cuti', icon: CalendarDays, active: true },
  { href: '/ess/expense', label: 'Klaim', icon: Wallet, active: false },
  { href: '/ess/profile', label: 'Profil', icon: User, active: false },
  { href: '/ess/notifications', label: 'Notif', icon: Bell, active: false },
];

const statusConfig: Record<
  RequestStatus,
  { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }
> = {
  PENDING: { label: 'Menunggu', variant: 'warning' },
  APPROVED: { label: 'Disetujui', variant: 'success' },
  REJECTED: { label: 'Ditolak', variant: 'destructive' },
  CANCELLED: { label: 'Dibatalkan', variant: 'secondary' },
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EssLeavePage() {
  const { data, isLoading, error, refetch } = useLeaveRequests();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const createLeaveRequest = useCreateLeaveRequest();
  const cancelLeaveRequest = useCancelLeaveRequest();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const form = useForm<LeaveRequestInput>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { leaveTypeId: '', startDate: '', endDate: '', reason: '' },
  });

  const requests: LeaveRequest[] = data?.data ?? [];

  async function onSubmit(values: LeaveRequestInput) {
    if (new Date(values.endDate) < new Date(values.startDate)) {
      form.setError('endDate', { message: 'Tanggal selesai harus setelah tanggal mulai' });
      return;
    }
    setFormError('');
    try {
      await createLeaveRequest.mutateAsync(values);
      setDialogOpen(false);
      form.reset({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      refetch();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Gagal mengajukan cuti');
    }
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelLeaveRequest.mutateAsync(id);
      refetch();
    } catch {
      /* ignore */
    } finally {
      setCancellingId(null);
    }
  }

  const header = (
    <Card className="rounded-none border-x-0 border-t-0 p-4 shadow-none">
      <div className="flex items-center gap-3">
        <Link
          href="/ess"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
          aria-label="Kembali"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Cuti Saya</h1>
      </div>
    </Card>
  );

  const nav = (
    <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background">
      <div className="flex justify-around py-2">
        {bottomNav.map((item) => (
          <Link key={item.label} href={item.href}>
            <div
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                item.active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md pb-20">
        {header}
        <div className="p-4">
          <PageSkeleton />
        </div>
        {nav}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md pb-20">
        {header}
        <div className="p-4">
          <ErrorState onRetry={() => refetch()} />
        </div>
        {nav}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pb-20">
      {header}

      <div className="px-4 py-4">
        <Button className="w-full gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajukan Cuti
        </Button>
      </div>

      <div className="space-y-3 px-4">
        {requests.length === 0 ? (
          <EmptyState
            title="Belum ada pengajuan cuti"
            description="Ajukan cuti pertama Anda dengan menekan tombol Ajukan Cuti."
          />
        ) : (
          requests.map((req) => {
            const cfg = statusConfig[req.status] ?? statusConfig.PENDING;
            return (
              <Card key={req.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {req.leaveType?.name ?? 'Cuti'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(req.startDate)}
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      {formatDate(req.endDate)}
                    </p>
                    {req.reason && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{req.reason}</p>
                    )}
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>

                {req.status === 'PENDING' && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancellingId === req.id}
                      onClick={() => handleCancel(req.id)}
                    >
                      {cancellingId === req.id ? 'Membatalkan...' : 'Batal'}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setFormError('');
            form.reset({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Cuti</DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Cuti</Label>
              <Controller
                control={form.control}
                name="leaveTypeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis cuti" />
                    </SelectTrigger>
                    <SelectContent>
                      {(leaveTypes as LeaveType[]).map((lt) => (
                        <SelectItem key={lt.id} value={lt.id}>
                          {lt.name} ({lt.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.leaveTypeId && (
                <p className="text-xs text-destructive">{form.formState.errors.leaveTypeId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Input label="Tanggal Mulai" type="date" {...form.register('startDate')} />
                {form.formState.errors.startDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Input label="Tanggal Selesai" type="date" {...form.register('endDate')} />
                {form.formState.errors.endDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alasan</Label>
              <textarea
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('reason')}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Mengirim...' : 'Kirim'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {nav}
    </div>
  );
}
