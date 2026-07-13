'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Rating {
  id: string;
  competency: string;
  score: number;
  description?: string;
}

interface ReviewGoal {
  id: string;
  title: string;
  status: string;
  targetValue?: number;
  actualValue?: number;
}

interface Review {
  id: string;
  overallScore?: number;
  summary?: string;
  strengths?: string;
  improvements?: string;
  status: string;
  submittedAt?: string;
  createdAt: string;
  employee: { id: string; fullName: string; employeeId: string };
  cycle: { id: string; name: string; period?: string; status: string };
  ratings: Rating[];
  goals: ReviewGoal[];
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ['review', params.id];
  const { data: review, error: queryError, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => api.get<Review>(`/performance/reviews/${params.id}`),
  });
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ summary: '', strengths: '', improvements: '' });
  const [actionError, setActionError] = useState('');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  useEffect(() => {
    if (review) {
      setForm({
        summary: review.summary || '',
        strengths: review.strengths || '',
        improvements: review.improvements || '',
      });
    }
  }, [review]);

  async function handleSave() {
    setSubmitting(true); setActionError('');
    try {
      await api.put(`/performance/reviews/${params.id}`, form);
      queryClient.invalidateQueries({ queryKey });
      setEditMode(false);
    } catch (e: any) { setActionError(e.message); }
    finally { setSubmitting(false); }
  }

  async function handleSubmit() {
    if (!confirm('Submit this review? This cannot be undone.')) return;
    setSubmitting(true); setActionError('');
    try {
      await api.post(`/performance/reviews/${params.id}/submit`, {});
      queryClient.invalidateQueries({ queryKey });
    } catch (e: any) { setActionError(e.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!review) return <p>Not found</p>;

  const avgScore = review.ratings?.length
    ? (review.ratings.reduce((a: any, b: any) => a + Number(b.score), 0) / review.ratings.length).toFixed(1)
    : null;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="m-0">{review.employee.fullName}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {review.employee.employeeId} · {review.cycle.name}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            review.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            review.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>{review.status}</span>
        </div>

        <div className="text-3xl font-bold mb-4">
          {avgScore || (review.overallScore ? Number(review.overallScore).toFixed(1) : '—')}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">/ 5</span>
        </div>

        <h4 className="m-0 mb-2">Competency Ratings</h4>
        <div className="grid gap-2 mb-4">
          {review.ratings.map((r: any) => (
            <div key={r.id} className="text-xs flex justify-between items-center">
              <span>{r.competency}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(Number(r.score) / 5) * 100}%` }} />
                </div>
                <span className="font-semibold min-w-[24px] text-right">{Number(r.score).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>

        {review.goals?.length > 0 && (
          <>
            <h4 className="m-0 mb-2">Related Goals</h4>
            {review.goals.map((g: any) => (
              <div key={g.id} className="text-xs flex justify-between mb-1">
                <span>{g.title}</span>
                <span className="text-gray-500 dark:text-gray-400">{g.actualValue ?? 0}/{g.targetValue ?? '—'} · {g.status}</span>
              </div>
            ))}
          </>
        )}

        {editMode ? (
          <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Summary</label>
              <textarea rows={3} value={form.summary}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Strengths</label>
              <textarea rows={3} value={form.strengths}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Areas for Improvement</label>
              <textarea rows={3} value={form.improvements}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                onChange={(e) => setForm({ ...form, improvements: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={submitting}>{submitting ? '…' : 'Save'}</Button>
              <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
            {review.summary && <div className="mb-2"><strong>Summary</strong><p className="text-xs m-0.5">{review.summary}</p></div>}
            {review.strengths && <div className="mb-2"><strong>Strengths</strong><p className="text-xs m-0.5">{review.strengths}</p></div>}
            {review.improvements && <div className="mb-2"><strong>Areas for Improvement</strong><p className="text-xs m-0.5">{review.improvements}</p></div>}
            {review.status !== 'COMPLETED' && (
              <Button variant="secondary" onClick={() => setEditMode(true)} className="mt-2">Edit Review</Button>
            )}
          </div>
        )}
      </Card>

      {review.status !== 'COMPLETED' && (
        <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white border-none">
          {submitting ? 'Submitting…' : 'Submit Review'}
        </Button>
      )}
    </div>
  );
}
