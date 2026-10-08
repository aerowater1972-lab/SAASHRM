'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateLoan } from '@/lib/hooks/expense';
import { loanSchema, type LoanInput } from '@/lib/schemas/expense';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewLoanPage() {
  const router = useRouter();
  const createLoan = useCreateLoan();
  const [error, setError] = useState('');
  const form = useForm<LoanInput>({
    resolver: zodResolver(loanSchema),
    defaultValues: { amount: undefined as unknown as number, installmentCount: 12, purpose: '', startDeductionFrom: '', notes: '' },
  });

  const amount = form.watch('amount');
  const installmentCount = form.watch('installmentCount');
  const installment = Number(amount) / Number(installmentCount) || 0;

  async function onSubmit(data: LoanInput) {
    setError('');
    try {
      const result = await createLoan.mutateAsync({
        amount: data.amount,
        installmentCount: data.installmentCount,
        purpose: data.purpose || undefined,
        startDeductionFrom: data.startDeductionFrom || undefined,
        notes: data.notes || undefined,
      });
      router.push(`/loans/${result.id}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengajuan Pinjaman Baru</h1>
        <p className="text-sm text-muted-foreground">Ajukan pinjaman baru</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-md">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Pinjaman</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input label="Jumlah Pinjaman (Rp)" type="number" min={1} {...form.register('amount', { valueAsNumber: true })} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Input label="Jumlah Cicilan (bulan)" type="number" min={1} {...form.register('installmentCount', { valueAsNumber: true })} />
              {form.formState.errors.installmentCount && <p className="text-xs text-destructive">{form.formState.errors.installmentCount.message}</p>}
            </div>

            {amount && Number(amount) > 0 && (
              <p className="text-sm text-muted-foreground -mt-2">
                Cicilan: <strong>Rp {installment.toLocaleString('id-ID')}</strong>/bulan
              </p>
            )}

            <div className="space-y-2">
              <Input label="Tujuan" {...form.register('purpose')} />
              {form.formState.errors.purpose && <p className="text-xs text-destructive">{form.formState.errors.purpose.message}</p>}
            </div>

            <div className="space-y-2">
              <Input label="Mulai Potong Dari (bulan)" type="month" {...form.register('startDeductionFrom')} />
              {form.formState.errors.startDeductionFrom && <p className="text-xs text-destructive">{form.formState.errors.startDeductionFrom.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <textarea aria-label="Catatan"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('notes')}
              />
              {form.formState.errors.notes && <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>}
            </div>

            <Button type="submit" disabled={createLoan.isPending} className="w-full">
              {createLoan.isPending ? 'Menyimpan…' : 'Ajukan'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
