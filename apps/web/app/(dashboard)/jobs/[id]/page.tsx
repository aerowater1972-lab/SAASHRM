'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useJob, usePublishJob, useCloseJob } from '@/lib/hooks/recruitment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Briefcase, MapPin, Users } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PUBLISHED: 'success',
  DRAFT: 'secondary',
  CLOSED: 'destructive',
  ON_HOLD: 'warning',
};

const appStatusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  NEW: 'info',
  SCREENING: 'warning',
  INTERVIEW: 'warning',
  OFFER: 'success',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  WITHDRAWN: 'secondary',
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: job, isLoading, error, refetch } = useJob(params.id as string);
  const publishJob = usePublishJob();
  const closeJob = useCloseJob();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handlePublish() {
    setActionLoading(true); setActionError('');
    try { await publishJob.mutateAsync(params.id as string); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleClose() {
    setActionLoading(true); setActionError('');
    try { await closeJob.mutateAsync(params.id as string); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!job) return <p className="text-muted-foreground">Lowongan tidak ditemukan</p>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      {actionError && <div className="text-destructive text-sm">{actionError}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {job.employmentType?.replace(/_/g, ' ') || '—'} · {job.location || 'Remote'}
                  </p>
                </div>
              </div>
              <Badge variant={(statusVariant[job.status] || 'secondary') as any}>{job.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Deskripsi</h4>
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>
            {job.requirements && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Persyaratan</h4>
                <p className="whitespace-pre-wrap">{job.requirements}</p>
              </div>
            )}
            {job.responsibilities && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Tanggung Jawab</h4>
                <p className="whitespace-pre-wrap">{job.responsibilities}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{job.location || 'Remote'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{job.filledSlots || 0}/{job.slots} terisi</span>
              </div>
              {job.minSalary && (
                <p className="text-xs text-muted-foreground">
                  Rp {Number(job.minSalary).toLocaleString('id-ID')} – Rp {Number(job.maxSalary).toLocaleString('id-ID')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              {job.status === 'DRAFT' && (
                <Button className="w-full" onClick={handlePublish} disabled={actionLoading}>
                  {actionLoading ? 'Mempublikasi…' : 'Publikasi'}
                </Button>
              )}
              {job.status === 'PUBLISHED' && (
                <Button variant="destructive" className="w-full" onClick={handleClose} disabled={actionLoading}>
                  {actionLoading ? 'Menutup…' : 'Tutup Lowongan'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pelamar ({job.applications?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(!job.applications || job.applications.length === 0) ? (
            <p className="text-sm text-muted-foreground">Belum ada pelamar.</p>
          ) : (
            <div className="divide-y">
              {job.applications.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium">{a.candidate?.firstName} {a.candidate?.lastName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{a.candidate?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(appStatusVariant[a.status] || 'secondary') as any} className="text-[10px]">{a.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(a.appliedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
