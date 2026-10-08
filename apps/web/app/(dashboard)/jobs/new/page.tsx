'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJob } from '@/hooks/use-jobs';
import { jobSchema, type JobInput } from '@/lib/schemas/recruitment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();
  const [error, setError] = useState('');

  const form = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '', description: '', requirements: '', responsibilities: '',
      positionId: '', employmentType: 'FULL_TIME', location: '',
      minSalary: '', maxSalary: '', slots: '1',
    },
  });

  async function onSubmit(data: JobInput) {
    createJob.mutate({
      title: data.title,
      description: data.description,
      requirements: data.requirements || undefined,
      responsibilities: data.responsibilities || undefined,
      positionId: data.positionId,
      employmentType: data.employmentType,
      location: data.location || undefined,
      minSalary: data.minSalary ? Number(data.minSalary) : undefined,
      maxSalary: data.maxSalary ? Number(data.maxSalary) : undefined,
      slots: Number(data.slots),
    }, {
      onSuccess: (result) => { router.push(`/jobs/${result.id}`); },
      onError: (e: any) => { setError(e.message); },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lowongan Pekerjaan Baru</h1>
        <p className="text-sm text-muted-foreground">Buat lowongan pekerjaan baru</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Pekerjaan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input label="Judul Pekerjaan *" {...form.register('title')} />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Deskripsi *</Label>
              <textarea aria-label="Deskripsi"
                required rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('description')}
              />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Input label="Position ID *" {...form.register('positionId')} />
                {form.formState.errors.positionId && <p className="text-xs text-destructive">{form.formState.errors.positionId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Jenis Ketenagakerjaan</Label>
                <Controller
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {employmentTypes.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Input label="Lokasi" {...form.register('location')} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Input label="Gaji Minimum" type="number" min={0} {...form.register('minSalary')} />
              </div>
              <div className="space-y-2">
                <Input label="Gaji Maksimum" type="number" min={0} {...form.register('maxSalary')} />
              </div>
              <div className="space-y-2">
                <Input label="Slot" type="number" min={1} {...form.register('slots')} />
                {form.formState.errors.slots && <p className="text-xs text-destructive">{form.formState.errors.slots.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Persyaratan</Label>
              <textarea aria-label="Persyaratan"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('requirements')}
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggung Jawab</Label>
              <textarea aria-label="Tanggung Jawab"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('responsibilities')}
              />
            </div>

            <Button type="submit" disabled={createJob.isPending} className="w-full">
              {createJob.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
