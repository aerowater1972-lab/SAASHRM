'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEngagementSurvey, useEngagementSurveyResults } from '@/lib/hooks/use-engagement-survey';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Users, MessageSquare, TrendingUp, BarChart3, Building2 } from 'lucide-react';
import type { SurveyResults, SurveyQuestionResult, DepartmentSurveyResult } from '@/lib/types';

function WordCloud({ answers }: { answers: string[] }) {
  const words = answers
    .flatMap(a => a.split(/[\s,.;!?]+/))
    .map(w => w.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ''))
    .filter(w => w.length > 3)
    .reduce<Record<string, number>>((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {});
  const sorted = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 50);
  const maxCount = sorted[0]?.[1] || 1;
  if (sorted.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 justify-center p-4">
      {sorted.map(([word, count]) => {
        const size = 0.7 + (count / maxCount) * 1.3;
        const opacity = 0.4 + (count / maxCount) * 0.6;
        return (
          <span key={word} style={{ fontSize: `${size}rem`, opacity }} className="inline-block transition-colors hover:text-primary">
            {word}
          </span>
        );
      })}
    </div>
  );
}

function QuestionCard({ q }: { q: SurveyQuestionResult }) {
  const stats = q.stats;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm">{q.questionText}</CardTitle>
          <Badge variant="outline" className="text-[10px]">{q.questionType}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          {stats.average !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">Rata-rata</p>
              <p className="text-lg font-semibold">{stats.average.toFixed(2)}</p>
            </div>
          )}
          {stats.enps !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">eNPS</p>
              <p className="text-lg font-semibold">{stats.enps}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Responden</p>
            <p className="text-lg font-semibold">{stats.count ?? 0}</p>
          </div>
        </div>

        {stats.distribution && stats.distribution.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Distribusi</p>
            {stats.distribution.map((d: any, i: number) => {
              const maxVal = Math.max(...(stats.distribution as any[]).map((x: any) => x.count), 1);
              const pct = (d.count / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-right">{d.option ?? d.value ?? d.optionValue}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        )}

        {stats.textAnswers && Array.isArray(stats.textAnswers) && stats.textAnswers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Word Cloud</p>
            <div className="border rounded-lg bg-muted/30">
              <WordCloud answers={stats.textAnswers} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DepartmentSection({ dept }: { dept: DepartmentSurveyResult }) {
  const visible = dept.questions.filter(q => q.stats?.thresholdMet !== false);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">{dept.departmentName}</h3>
        <Badge variant="outline" className="text-[10px]">{dept.respondentCount} responden</Badge>
      </div>
      {visible.map(q => <QuestionCard key={q.id || (q as any).questionId} q={q} />)}
    </div>
  );
}

export default function EngagementSurveyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: survey } = useEngagementSurvey(id);
  const { data: results, isLoading, error, refetch } = useEngagementSurveyResults(id);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat hasil'} onRetry={() => refetch()} />;
  if (!results) return <p className="text-muted-foreground">Hasil tidak tersedia</p>;

  const r = results as any;
  const questions: SurveyQuestionResult[] = (r.questions ?? r.questionResults ?? []).filter((q: any) => q.stats?.thresholdMet !== false);
  const deptBreakdown: DepartmentSurveyResult[] = r.departmentBreakdown ?? [];
  const surveyEnps = questions.find(q => q.questionType === 'NPS')?.stats?.enps;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hasil Survey</h1>
          <p className="text-sm text-muted-foreground">{survey?.title || '—'}</p>
        </div>
        <Badge variant="outline" className="ml-auto">{survey?.type}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Respon</p></div>
            <p className="mt-1 text-xl font-bold">{r.totalResponses ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Responden</p></div>
            <p className="mt-1 text-xl font-bold">{r.totalRespondents ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Min. Threshold</p></div>
            <p className="mt-1 text-xl font-bold">{r.minThreshold ?? 5}</p>
          </CardContent>
        </Card>
        {surveyEnps !== undefined && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">eNPS</p></div>
              <p className={`mt-1 text-xl font-bold ${surveyEnps >= 0 ? 'text-green-600' : 'text-red-600'}`}>{surveyEnps}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {questions.length === 0 && deptBreakdown.length === 0 && (
        <p className="text-sm text-muted-foreground">Hasil belum tersedia karena jumlah responden belum mencukupi.</p>
      )}

      {/* Department breakdown (FR-05) */}
      {deptBreakdown.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Per Departemen</h2>
          {deptBreakdown.map(dept => <DepartmentSection key={dept.departmentId} dept={dept} />)}
        </div>
      )}

      {/* Aggregate results */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Agregat</h2>
          {questions.map(q => <QuestionCard key={q.id || (q as any).questionId} q={q} />)}
        </div>
      )}
    </div>
  );
}
