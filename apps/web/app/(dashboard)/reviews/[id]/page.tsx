'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReview, useUpdateReview, useSubmitReview } from '@/lib/hooks/performance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Star, Target, Edit3, CheckCircle } from 'lucide-react';

interface Rating { id: string; competency: string; score: number; description?: string }
interface ReviewGoal { id: string; title: string; status: string; targetValue?: number; actualValue?: number }
interface Review {
  id: string; overallScore?: number; summary?: string; strengths?: string; improvements?: string;
  status: string; submittedAt?: string; createdAt: string;
  employee: { id: string; fullName: string; employeeId: string };
  cycle: { id: string; name: string; period?: string; status: string };
  ratings: Rating[]; goals: ReviewGoal[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary'> = {
  COMPLETED: 'success', IN_PROGRESS: 'info', DRAFT: 'secondary', PENDING: 'warning',
};

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: review, isLoading, error, refetch } = useReview(params.id as string);
  const updateReview = useUpdateReview();
  const submitReview = useSubmitReview();
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ summary: '', strengths: '', improvements: '' });
  const [actionError, setActionError] = useState('');
  const errMsg = (error instanceof Error ? error.message : '') || actionError;

  useEffect(() => {
    if (review) setForm({ summary: review.summary || '', strengths: review.strengths || '', improvements: review.improvements || '' });
  }, [review]);

  if (isLoading) return <PageSkeleton />;
  if (error || !review) return <ErrorState message={errMsg || 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  const avgScore = review.ratings?.length
    ? (review.ratings.reduce((a, b) => a + Number(b.score), 0) / review.ratings.length).toFixed(1)
    : null;

  async function handleSave() {
    setSubmitting(true); setActionError('');
    try { await updateReview.mutateAsync({ id: params.id as string, data: form }); refetch(); setEditMode(false); }
    catch (e: any) { setActionError(e.message); }
    finally { setSubmitting(false); }
  }

  async function handleSubmit() {
    if (!confirm('Submit review ini? Tidak bisa dibatalkan.')) return;
    setSubmitting(true); setActionError('');
    try { await submitReview.mutateAsync(params.id as string); refetch(); }
    catch (e: any) { setActionError(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{review.employee?.fullName}</h1>
          <p className="text-sm text-muted-foreground">{review.employee?.employeeId} &middot; {review.cycle?.name}</p>
        </div>
        <Badge variant={(statusVariant[review.status] || 'secondary') as any} className="ml-auto">{review.status}</Badge>
      </div>

      {errMsg && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errMsg}</div>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" />Overall Score</CardTitle></CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{avgScore || (review.overallScore ? Number(review.overallScore).toFixed(1) : '—')}<span className="text-lg font-normal text-muted-foreground ml-1">/ 5</span></p>
        </CardContent>
      </Card>

      {review.ratings && review.ratings.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Competency Ratings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {review.ratings.map((r: any) => (
              <div key={r.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{r.competency}</span>
                  <span className="font-semibold">{Number(r.score).toFixed(1)}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(Number(r.score) / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {review.goals && review.goals.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" />Related Goals</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {review.goals.map((g: any) => (
              <div key={g.id} className="flex justify-between text-sm">
                <span>{g.title}</span>
                <span className="text-muted-foreground">{g.actualValue ?? 0}/{g.targetValue ?? '—'} &middot; <Badge variant="outline" className="text-[10px]">{g.status}</Badge></span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Review Notes</CardTitle></CardHeader>
        <CardContent>
          {editMode ? (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Summary</Label><textarea aria-label="Summary" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
              <div className="space-y-2"><Label>Strengths</Label><textarea aria-label="Strengths" rows={3} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
              <div className="space-y-2"><Label>Areas for Improvement</Label><textarea aria-label="Areas for Improvement" rows={3} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={submitting}>{submitting ? '…' : 'Simpan'}</Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {review.summary && <div><p className="text-sm font-medium">Summary</p><p className="text-sm text-muted-foreground mt-0.5">{review.summary}</p></div>}
              {review.strengths && <div><p className="text-sm font-medium">Strengths</p><p className="text-sm text-muted-foreground mt-0.5">{review.strengths}</p></div>}
              {review.improvements && <div><p className="text-sm font-medium">Areas for Improvement</p><p className="text-sm text-muted-foreground mt-0.5">{review.improvements}</p></div>}
              {!review.summary && !review.strengths && !review.improvements && <p className="text-sm text-muted-foreground">Belum ada catatan review.</p>}
              {review.status !== 'COMPLETED' && <Button variant="outline" onClick={() => setEditMode(true)}><Edit3 className="mr-2 h-4 w-4" />Edit Review</Button>}
            </div>
          )}
        </CardContent>
      </Card>

      {review.status !== 'COMPLETED' && (
        <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="mr-2 h-4 w-4" />{submitting ? 'Submitting…' : 'Submit Review'}
        </Button>
      )}
    </div>
  );
}
