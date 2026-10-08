'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateGoal } from '@/lib/hooks/performance';
import { goalSchema, type GoalInput } from '@/lib/schemas/performance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewGoalPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const form = useForm<GoalInput>({ resolver: zodResolver(goalSchema) });
  const createGoal = useCreateGoal();

  async function onSubmit(data: GoalInput) {
    setError('');
    try {
      const result = await createGoal.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        metric: data.metric || undefined,
        targetValue: data.targetValue ? Number(data.targetValue) : undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      });
      router.push(`/goals/${result.id}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tujuan Baru</h1>
        <p className="text-sm text-muted-foreground">Buat tujuan dan target kerja baru</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-lg">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Tujuan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul *</Label>
              <Input id="title" {...form.register('title')} />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <textarea aria-label="Deskripsi"
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metric">Metrik (cth. &quot;Panggilan sales&quot;, &quot;Review kode&quot;)</Label>
              <Input id="metric" {...form.register('metric')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetValue">Nilai Target</Label>
              <Input id="targetValue" type="number" min={0} {...form.register('targetValue')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input id="startDate" type="date" {...form.register('startDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Selesai</Label>
                <Input id="endDate" type="date" {...form.register('endDate')} />
              </div>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? 'Membuat…' : 'Buat Tujuan'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
