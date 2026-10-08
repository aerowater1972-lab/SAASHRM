'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEngagementSurvey } from '@/lib/hooks/use-engagement-survey';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, BarChart3, ClipboardList, Edit } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary', ACTIVE: 'success', CLOSED: 'info', ARCHIVED: 'destructive',
};

export default function EngagementSurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: survey, isLoading, error, refetch } = useEngagementSurvey(id);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (!survey) return <p className="text-muted-foreground">Survey tidak ditemukan</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
          <p className="text-sm text-muted-foreground">Detail engagement survey</p>
        </div>
        <Badge variant={statusVariant[survey.status] || 'secondary'} className="ml-auto">{survey.status}</Badge>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push(`/engagement-survey/new?id=${survey.id}`)}>
          <Edit className="mr-1 h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/engagement-survey/${survey.id}/results`)}>
          <BarChart3 className="mr-1 h-4 w-4" /> Hasil
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/engagement-survey/${survey.id}/action-items`)}>
          <ClipboardList className="mr-1 h-4 w-4" /> Action Items
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Informasi Survey</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Tipe</span><p className="font-medium">{survey.type}</p></div>
          <div><span className="text-muted-foreground">Anonim</span><p className="font-medium">{survey.isAnonymous ? 'Ya' : 'Tidak'}</p></div>
          <div><span className="text-muted-foreground">Periode</span><p className="font-medium">{new Date(survey.startDate).toLocaleDateString('id-ID')} - {new Date(survey.endDate).toLocaleDateString('id-ID')}</p></div>
          <div><span className="text-muted-foreground">Respon</span><p className="font-medium">{survey._count?.responses ?? 0}</p></div>
          {survey.targetScope && (() => {
            try { const scope = JSON.parse(survey.targetScope); return (
              <div className="col-span-2"><span className="text-muted-foreground">Target Scope</span>
                <p className="font-medium text-xs mt-1">
                  {scope.departments?.length ? `Departemen: ${scope.departments.length} terpilih` : ''}
                  {scope.departments?.length && scope.grades?.length ? ' | ' : ''}
                  {scope.grades?.length ? `Grade: ${scope.grades.length} terpilih` : ''}
                  {!scope.departments?.length && !scope.grades?.length ? 'Semua karyawan' : ''}
                </p>
              </div>
            ); } catch { return null; }
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Pertanyaan ({survey.questions?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {survey.questions?.map((q, idx) => (
            <div key={q.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium">{idx + 1}. {q.questionText}</p>
                <Badge variant="outline" className="text-[10px]">{q.questionType}</Badge>
              </div>
              {q.options && (
                <p className="text-xs text-muted-foreground mt-1">Opsi: {q.options}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
