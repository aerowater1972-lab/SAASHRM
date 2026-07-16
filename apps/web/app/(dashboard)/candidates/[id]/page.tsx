'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCandidate } from '@/lib/hooks/recruitment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Mail, Phone, Building2, User } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  HIRED: 'success',
  REJECTED: 'destructive',
  BLACKLISTED: 'destructive',
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

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: candidate, isLoading, error, refetch } = useCandidate(params.id as string);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!candidate) return <p className="text-muted-foreground">Kandidat tidak ditemukan</p>;
  const c = candidate as any;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{c.firstName} {c.lastName}</CardTitle>
              </div>
              <Badge variant={(statusVariant[c.status] || 'secondary') as any}>{c.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
            </div>
            {c.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{c.phone}</span>
              </div>
            )}
            {c.currentPosition && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{c.currentPosition}{c.currentCompany ? ` @ ${c.currentCompany}` : ''}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sumber: {c.source || '—'}</span>
              <span>Bergabung: {new Date(c.createdAt).toLocaleDateString('id-ID')}</span>
            </div>
            {c.notes && <p className="text-xs italic text-muted-foreground">{c.notes}</p>}
          </CardContent>
        </Card>

        {c.resumeUrl && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer">Lihat Resume</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Lamaran ({c.applications?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(!c.applications || c.applications.length === 0) ? (
            <p className="text-sm text-muted-foreground">Belum ada lamaran.</p>
          ) : (
            <div className="divide-y">
              {c.applications.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{a.jobPosting?.title || '—'}</span>
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
