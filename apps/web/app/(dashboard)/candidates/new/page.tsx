'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCandidate } from '@/hooks/use-candidates';
import { candidateSchema, type CandidateInput } from '@/lib/schemas/recruitment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewCandidatePage() {
  const router = useRouter();
  const createCandidate = useCreateCandidate();
  const [error, setError] = useState('');

  const form = useForm<CandidateInput>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '',
      source: '', currentCompany: '', currentPosition: '', notes: '',
    },
  });

  async function onSubmit(data: CandidateInput) {
    createCandidate.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      source: data.source || undefined,
      currentCompany: data.currentCompany || undefined,
      currentPosition: data.currentPosition || undefined,
      notes: data.notes || undefined,
    }, {
      onSuccess: (result) => { router.push(`/candidates/${result.id}`); },
      onError: (e: any) => { setError(e.message); },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kandidat Baru</h1>
        <p className="text-sm text-muted-foreground">Tambah kandidat baru</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-lg">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Informasi Kandidat</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Input label="Nama Depan *" {...form.register('firstName')} />
                {form.formState.errors.firstName && <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Input label="Nama Belakang *" {...form.register('lastName')} />
                {form.formState.errors.lastName && <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Input label="Email *" type="email" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Input label="Telepon" {...form.register('phone')} />
            </div>
            <div className="space-y-2">
              <Input label="Sumber (LinkedIn, Referral, dll.)" {...form.register('source')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Input label="Perusahaan Saat Ini" {...form.register('currentCompany')} />
              </div>
              <div className="space-y-2">
                <Input label="Posisi Saat Ini" {...form.register('currentPosition')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <textarea aria-label="Catatan"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('notes')}
              />
            </div>
            <Button type="submit" disabled={createCandidate.isPending} className="w-full">
              {createCandidate.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
