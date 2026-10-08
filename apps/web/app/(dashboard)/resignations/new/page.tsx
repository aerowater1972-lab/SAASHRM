'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createResignationSchema, type CreateResignationInput } from '@/lib/schemas/benefits';
import { useCreateResignation } from '@/hooks/use-resignations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const types = ['RESIGNATION', 'RETIREMENT', 'TERMINATION', 'END_OF_CONTRACT'];

export default function NewResignationPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const createResignation = useCreateResignation();

  const form = useForm<CreateResignationInput>({
    resolver: zodResolver(createResignationSchema),
    defaultValues: { type: 'RESIGNATION', reason: '', resignationDate: '', notes: '' },
  });

  async function onSubmit(data: CreateResignationInput) {
    setError('');
    try {
      const result = await createResignation.mutateAsync(data);
      router.push(`/resignations/${result.id}`);
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengajuan Resignasi Baru</h1>
        <p className="text-sm text-muted-foreground">Ajukan resignasi, pensiun, atau pemberhentian</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-lg">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Resignasi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                    <SelectContent>
                      {types.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Alasan *</Label>
              <textarea aria-label="Alasan"
                rows={4}
                {...form.register('reason')}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tanggal Resignasi *</Label>
              <Input type="date" {...form.register('resignationDate')} />
              {form.formState.errors.resignationDate && <p className="text-xs text-destructive">{form.formState.errors.resignationDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <textarea aria-label="Catatan"
                rows={3}
                {...form.register('notes')}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {form.formState.errors.notes && <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>}
            </div>

            <Button type="submit" disabled={createResignation.isPending} className="w-full">
              {createResignation.isPending ? 'Mengirim…' : 'Ajukan Resignasi'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
