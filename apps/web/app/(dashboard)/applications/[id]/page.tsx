'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApplication, useUpdateApplicationStatus } from '@/lib/hooks/recruitment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, User, Briefcase, DollarSign, CalendarDays, Star, FileText } from 'lucide-react';

interface Interview { id: string; stage: number; type: string; scheduledAt: string; durationMinutes: number; location?: string; meetingLink?: string; score?: number; feedback?: string; status: string; interviewerId: string }
interface Offer { id: string; baseSalary: number; allowance?: number; benefitDescription?: string; joinDate: string; status: string; sentAt?: string; acceptedAt?: string; notes?: string }
interface OnboardingDoc { id: string; docType: string; fileUrl: string; uploadedAt: string }
interface Application {
  id: string; status: string; appliedAt: string; expectedSalary?: number; notes?: string;
  candidate: { id: string; firstName: string; lastName: string; email: string; phone?: string; resumeUrl?: string };
  jobPosting: { id: string; title: string; description?: string };
  interviews: Interview[]; offers: Offer[]; onboardingDocuments?: OnboardingDoc[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  HIRED: 'success', REJECTED: 'destructive', OFFER: 'info', INTERVIEW: 'warning', SCREENING: 'info', NEW: 'secondary',
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: app, isLoading, error, refetch } = useApplication(params.id as string);
  const updateApplicationStatus = useUpdateApplicationStatus();
  const [actionLoading, setActionLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const errMsg = (error instanceof Error ? error.message : '') || actionError;

  if (isLoading) return <PageSkeleton />;
  if (error || !app) return <ErrorState message={errMsg || 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  const statuses = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

  async function handleStatusUpdate() {
    if (!newStatus) return;
    setActionLoading(true); setActionError('');
    try { await updateApplicationStatus.mutateAsync({ id: params.id as string, status: newStatus }); refetch(); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{app.candidate?.firstName} {app.candidate?.lastName}</h1>
          <p className="text-sm text-muted-foreground">{app.jobPosting?.title}</p>
        </div>
        <Badge variant={(statusVariant[app.status] || 'secondary') as any} className="ml-auto">{app.status}</Badge>
      </div>

      {errMsg && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errMsg}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Candidate Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="font-medium">{app.candidate?.email}</p><p className="text-xs text-muted-foreground">{app.candidate?.phone || '—'}</p></div></div>
            {app.candidate?.resumeUrl && <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-muted-foreground mt-0.5" /><a href={app.candidate?.resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View Resume</a></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Application Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-3"><Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{app.jobPosting?.title}</span></div>
            {app.expectedSalary && <div className="flex items-start gap-3"><DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" /><span>Expected: Rp {Number(app.expectedSalary).toLocaleString('id-ID')}</span></div>}
            <div className="flex items-start gap-3"><CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{new Date(app.appliedAt).toLocaleDateString('id-ID')}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Update Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                <SelectContent>
                  {statuses.filter((s) => s !== app.status).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStatusUpdate} disabled={!newStatus || actionLoading}>{actionLoading ? '…' : 'Update'}</Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4" />Interviews ({app.interviews?.length})</h3>
        {(!app.interviews || app.interviews.length === 0) && <p className="text-sm text-muted-foreground">Belum ada interview.</p>}
        {app.interviews?.map((i: any) => (
          <Card key={i.id} className="mb-2">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">Stage {i.stage}</span> &middot; {i.type} &middot; {new Date(i.scheduledAt).toLocaleDateString('id-ID')} ({i.durationMinutes}min)
                  {i.score && <span className="ml-2">Score: <strong>{Number(i.score).toFixed(1)}</strong></span>}
                </div>
                <Badge variant={i.status === 'COMPLETED' ? 'success' : i.status === 'SCHEDULED' ? 'info' : 'secondary'} className="text-[10px]">{i.status}</Badge>
              </div>
              {i.feedback && <p className="text-xs text-muted-foreground mt-1">{i.feedback}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Offers ({app.offers?.length})</h3>
        {(!app.offers || app.offers.length === 0) && <p className="text-sm text-muted-foreground">Belum ada offer.</p>}
        {app.offers?.map((o: any) => (
          <Card key={o.id} className="mb-2">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm">
                <div>
                  <span className="font-semibold">Rp {Number(o.baseSalary).toLocaleString('id-ID')}</span>
                  {o.allowance ? <span className="text-muted-foreground"> + Rp {Number(o.allowance).toLocaleString('id-ID')}</span> : ''}
                </div>
                <div className="text-right">
                  <Badge variant={o.status === 'ACCEPTED' ? 'success' : o.status === 'SENT' ? 'info' : 'warning'} className="text-[10px]">{o.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">Join: {new Date(o.joinDate).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
              {o.benefitDescription && <p className="text-xs text-muted-foreground mt-1">{o.benefitDescription}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {app.onboardingDocuments && app.onboardingDocuments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Onboarding Documents ({app.onboardingDocuments.length})</h3>
          {app.onboardingDocuments.map((d: any) => (
            <Card key={d.id} className="mb-2">
              <CardContent className="p-4 flex justify-between text-sm">
                <span className="font-medium">{d.docType}</span>
                <div className="text-muted-foreground text-xs">
                  {new Date(d.uploadedAt).toLocaleDateString('id-ID')}
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="ml-2 text-primary hover:underline">Lihat</a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
