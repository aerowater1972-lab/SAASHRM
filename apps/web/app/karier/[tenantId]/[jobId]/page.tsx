'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, CheckCircle2, MapPin, Briefcase } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1';

const applySchema = z.object({
  firstName: z.string().min(1, 'Nama depan wajib diisi'),
  lastName: z.string().min(1, 'Nama belakang wajib diisi'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  currentCompany: z.string().optional(),
  currentPosition: z.string().optional(),
  expectedSalary: z.number().min(0).optional(),
  coverNote: z.string().optional(),
});
type ApplyInput = z.infer<typeof applySchema>;

function formatRp(n: unknown) {
  if (n === null || n === undefined) return null;
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

export default function CareerDetailPage({ params }: { params: { tenantId: string; jobId: string } }) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const form = useForm<ApplyInput>({ resolver: zodResolver(applySchema) });

  useEffect(() => {
    fetch(`${API}/careers/${params.tenantId}/jobs/${params.jobId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Lowongan tidak ditemukan / sudah ditutup');
        return r.json();
      })
      .then((d) => setJob(d?.data ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.tenantId, params.jobId]);

  async function onSubmit(data: ApplyInput) {
    setSubmitError('');
    const r = await fetch(`${API}/careers/${params.tenantId}/jobs/${params.jobId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setSubmitError((body as any)?.message || 'Gagal mengirim lamaran');
      return;
    }
    setDone(true);
  }

  if (loading) return <p className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted-foreground">Memuat…</p>;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorState onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Link href={`/karier/${params.tenantId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Semua lowongan
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{job?.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {job?.employmentType && <Badge variant="secondary">{job.employmentType}</Badge>}
          {job?.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
          {job?.slots && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.slots} slot</span>}
        </div>
        {(job?.minSalary != null || job?.maxSalary != null) && (
          <p className="mt-2 text-lg font-semibold text-primary">
            {job.minSalary != null && job.maxSalary != null
              ? `${formatRp(job.minSalary)} – ${formatRp(job.maxSalary)}`
              : formatRp(job.minSalary ?? job.maxSalary)}
          </p>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Deskripsi</CardTitle></CardHeader>
        <CardContent className="whitespace-pre-line text-sm">{job?.description}</CardContent>
      </Card>
      {job?.requirements && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Persyaratan</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-line text-sm">{job.requirements}</CardContent>
        </Card>
      )}
      {job?.responsibilities && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Tanggung Jawab</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-line text-sm">{job.responsibilities}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Lamar Posisi Ini</CardTitle></CardHeader>
        <CardContent>
          {done ? (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-sm dark:bg-emerald-950">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-semibold">Lamaran terkirim!</p>
                <p className="text-muted-foreground">Tim rekrutmen akan menghubungi Anda bila kualifikasi cocok. Terima kasih.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {submitError && <p className="text-xs text-destructive">{submitError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nama depan *</Label>
                  <Input {...form.register('firstName')} placeholder="Siti" />
                  {form.formState.errors.firstName && <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nama belakang *</Label>
                  <Input {...form.register('lastName')} placeholder="Rahayu" />
                  {form.formState.errors.lastName && <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" {...form.register('email')} placeholder="siti@email.id" />
                  {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>No. HP</Label>
                  <Input {...form.register('phone')} placeholder="08xx" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link CV/Resume</Label>
                <Input {...form.register('resumeUrl')} placeholder="https://…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Perusahaan saat ini</Label>
                  <Input {...form.register('currentCompany')} />
                </div>
                <div className="space-y-2">
                  <Label>Posisi saat ini</Label>
                  <Input {...form.register('currentPosition')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ekspektasi gaji (Rp)</Label>
                  <Input type="number" min={0} {...form.register('expectedSalary', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Catatan pengantar</Label>
                  <Input {...form.register('coverNote')} placeholder="Opsional" />
                </div>
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? 'Mengirim…' : 'Kirim Lamaran'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
