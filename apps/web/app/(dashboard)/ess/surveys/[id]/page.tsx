'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEngagementSurvey, useSubmitEngagementSurveyResponse } from '@/lib/hooks/use-engagement-survey';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, HelpCircle, Star, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const likert5Labels = ['Sangat Tidak Setuju', 'Tidak Setuju', 'Netral', 'Setuju', 'Sangat Setuju'];
const likert7Labels = ['STS', 'TS', 'AS', 'N', 'AS', 'S', 'SS'];

export default function SurveyFillPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: survey, isLoading, error, refetch } = useEngagementSurvey(id);
  const submitMutation = useSubmitEngagementSurveyResponse();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (survey) {
      const initial: Record<string, string> = {};
      survey.questions?.forEach((q: any) => {
        if (q.questionType === 'FREE_TEXT') initial[q.id] = '';
      });
      setAnswers(initial);
    }
  }, [survey]);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat survei'} onRetry={() => refetch()} />;
  if (!survey) return <p className="text-muted-foreground">Survei tidak ditemukan</p>;
  const s = survey as any;
  if (done) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <ThumbsUp className="h-12 w-12 text-green-500" />
      <h2 className="text-xl font-bold">Terima Kasih!</h2>
      <p className="text-muted-foreground">Respons Anda telah tercatat.</p>
      <Button onClick={() => router.push('/ess')}>Kembali ke ESS</Button>
    </div>
  );

  const questions = s.questions || [];
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q: any) => {
    const val = answers[q.id];
    if (q.questionType === 'FREE_TEXT') return val?.trim()?.length > 0;
    if (q.questionType === 'MULTIPLE_CHOICE') return val?.split(',').filter(Boolean).length > 0;
    return val !== undefined && val !== '';
  }).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const setAnswer = (questionId: string, value: string) => setAnswers(prev => ({ ...prev, [questionId]: value }));

  async function handleSubmit() {
    const missing = (s.questions || []).filter((q: any) => q.isRequired && !answers[q.id]?.trim());
    if (missing.length > 0) {
      alert('Harap isi semua pertanyaan wajib.');
      return;
    }
    setSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        id: s.id,
        data: {
          surveyId: s.id,
          responses: (s.questions || []).map((q: any) => ({
            questionId: q.id,
            answerValue: answers[q.id] ?? '',
          })),
        },
      });
      setDone(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{s.title}</h1>
          {s.isAnonymous && <Badge variant="outline" className="text-[10px]">Anonim</Badge>}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{answeredCount} / {totalQuestions} ({progressPct}%)</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {s.type === 'ENPS' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-sm text-blue-800">
            <p className="font-medium">Skala 0–10: Seberapa mungkin Anda merekomendasikan perusahaan ini sebagai tempat kerja?</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(s.questions || []).map((q: any, idx: number) => (
          <Card key={q.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-start gap-2">
                <span className="text-muted-foreground">{idx + 1}.</span>
                <span>{q.questionText}</span>
                {q.isRequired && <span className="text-destructive">*</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.questionType === 'LIKERT_5' && (
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  {likert5Labels.map((label, i) => (
                    <button key={i} type="button"
                      onClick={() => setAnswer(q.id, String(i + 1))}
                      className={`px-3 py-2 rounded-md text-xs border transition-colors ${
                        answers[q.id] === String(i + 1)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted'
                      }`}
                    >
                      {i + 1}<br /><span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              )}
              {q.questionType === 'LIKERT_7' && (
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  {Array.from({ length: 7 }, (_, i) => i + 1).map(i => (
                    <button key={i} type="button"
                      onClick={() => setAnswer(q.id, String(i))}
                      className={`px-3 py-2 rounded-md text-xs border transition-colors ${
                        answers[q.id] === String(i)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              )}
              {q.questionType === 'NPS' && (
                <div className="flex gap-1 flex-wrap justify-center">
                  {Array.from({ length: 11 }, (_, i) => i).map(i => (
                    <button key={i} type="button"
                      onClick={() => setAnswer(q.id, String(i))}
                      className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${
                        answers[q.id] === String(i)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : i >= 9 ? 'bg-green-50 border-green-300 hover:bg-green-100'
                            : i <= 6 ? 'bg-red-50 border-red-300 hover:bg-red-100'
                              : 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              )}
              {q.questionType === 'FREE_TEXT' && (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Tulis jawaban Anda..."
                />
              )}
              {(q.questionType === 'SINGLE_CHOICE') && (
                <div className="space-y-1">
                  {(q.options ? (typeof q.options === 'string' ? q.options.split(',') : q.options) : []).map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input type="radio" name={`q-${q.id}`} value={opt}
                        checked={answers[q.id] === opt}
                        onChange={e => setAnswer(q.id, e.target.value)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.questionType === 'MULTIPLE_CHOICE' && (
                <div className="space-y-1">
                  {(q.options ? (typeof q.options === 'string' ? q.options.split(',') : q.options) : []).map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" value={opt}
                        checked={(answers[q.id] || '').split(',').includes(opt)}
                        onChange={e => {
                          const current = (answers[q.id] || '').split(',').filter(Boolean);
                          const updated = e.target.checked ? [...current, opt] : current.filter(v => v !== opt);
                          setAnswer(q.id, updated.join(','));
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
        </Button>
      </div>
    </div>
  );
}
