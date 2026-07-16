'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useExpenseClaims, useCreateExpenseClaim } from '@/lib/hooks/expense';
import { expenseClaimSchema } from '@/lib/schemas/expense';
import type { ExpenseClaim, RequestStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Clock,
  CalendarDays,
  Wallet,
  User,
  Bell,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';

const expenseClaimFormSchema = z.object({
  title: expenseClaimSchema.shape.title,
  description: expenseClaimSchema.shape.description,
  items: z
    .array(
      z.object({
        description: z.string().min(1, 'Deskripsi item wajib diisi'),
        amount: z.number().min(0.01, 'Jumlah harus lebih dari 0'),
      }),
    )
    .min(1, 'Minimal satu item pengeluaran diperlukan'),
});

type FormValues = z.infer<typeof expenseClaimFormSchema>;

const statusMap: Record<RequestStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }> = {
  PENDING: { label: 'Menunggu', variant: 'warning' },
  APPROVED: { label: 'Disetujui', variant: 'success' },
  REJECTED: { label: 'Ditolak', variant: 'destructive' },
  CANCELLED: { label: 'Dibatalkan', variant: 'secondary' },
};

function claimTotal(claim: ExpenseClaim): number {
  if (claim.items && claim.items.length > 0) {
    return claim.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }
  return Number(claim.totalAmount) || 0;
}

function formatDate(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function EssExpensePage() {
  const { data, isLoading, error, refetch } = useExpenseClaims();
  const createMut = useCreateExpenseClaim();
  const [open, setOpen] = useState(false);

  const claims = (data?.data ?? []) as ExpenseClaim[];

  return (
    <div className="mx-auto max-w-md pb-20">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0 p-4 shadow-none">
        <div className="flex items-center gap-3">
          <Link href="/ess" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Klaim Biaya</h1>
        </div>
      </Card>

      {/* Action */}
      <div className="px-4 py-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Ajukan Klaim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajukan Klaim</DialogTitle>
            </DialogHeader>
            <ExpenseClaimForm
              onCreate={(values) => createMut.mutateAsync(values)}
              isSubmitting={createMut.isPending}
              onSuccess={() => {
                setOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="space-y-3 px-4">
        {isLoading && (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        )}

        {error && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !error && claims.length === 0 && (
          <EmptyState title="Belum ada klaim" description="Anda belum mengajukan klaim biaya." />
        )}

        {!isLoading &&
          !error &&
          claims.map((claim) => {
            const status = statusMap[claim.status] ?? { label: claim.status, variant: 'secondary' as const };
            return (
              <Card key={claim.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{claim.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(claim.createdAt)}</p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                {claim.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{claim.description}</p>
                )}
                <p className="mt-3 text-lg font-bold">
                  Rp {claimTotal(claim).toLocaleString('id-ID')}
                </p>
                {claim.items && claim.items.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{claim.items.length} item</p>
                )}
              </Card>
            );
          })}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background">
        <div className="flex justify-around py-2">
          {[
            { href: '/ess', label: 'Home', icon: Clock, active: false },
            { href: '/ess/leave', label: 'Cuti', icon: CalendarDays, active: false },
            { href: '/ess/expense', label: 'Klaim', icon: Wallet, active: true },
            { href: '/ess/profile', label: 'Profil', icon: User, active: false },
            { href: '/ess/notifications', label: 'Notif', icon: Bell, active: false },
          ].map((item) => (
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
    </div>
  );
}

function ExpenseClaimForm({
  onCreate,
  isSubmitting,
  onSuccess,
}: {
  onCreate: (values: FormValues) => Promise<unknown>;
  isSubmitting: boolean;
  onSuccess: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(expenseClaimFormSchema),
    defaultValues: {
      title: '',
      description: '',
      items: [{ description: '', amount: undefined as unknown as number }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onSubmit = async (values: FormValues) => {
    try {
      await onCreate(values);
      reset();
      onSuccess();
    } catch {
      /* error handled by mutation */
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Judul</Label>
        <Input id="title" placeholder="Contoh: Biaya Perjalanan Dinas" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Deskripsi</Label>
        <textarea
          id="description"
          rows={3}
          placeholder="Keterangan klaim (opsional)"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Item</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', amount: undefined as unknown as number })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Tambah Item
          </Button>
        </div>

        {fields.map((field, index) => (
          <Card key={field.id} className="space-y-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Hapus item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.description`}>Deskripsi Item</Label>
              <Input
                id={`items.${index}.description`}
                placeholder="Contoh: Transportasi"
                {...register(`items.${index}.description` as const)}
              />
              {errors.items?.[index]?.description && (
                <p className="text-xs text-destructive">{errors.items[index]?.description?.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.amount`}>Jumlah</Label>
              <Input
                id={`items.${index}.amount`}
                type="number"
                inputMode="decimal"
                placeholder="0"
                {...register(`items.${index}.amount` as const, { valueAsNumber: true })}
              />
              {errors.items?.[index]?.amount && (
                <p className="text-xs text-destructive">{errors.items[index]?.amount?.message}</p>
              )}
            </div>
          </Card>
        ))}

        {errors.items?.message && <p className="text-xs text-destructive">{errors.items.message}</p>}
        {errors.items?.root?.message && (
          <p className="text-xs text-destructive">{errors.items.root.message}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kirim
        </Button>
      </div>
    </form>
  );
}
