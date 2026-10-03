'use client';

import { useRouter } from 'next/navigation';
import { useEngagementSurveys } from '@/lib/hooks/use-engagement-survey';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ClipboardList, HelpCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ESSSurveysPage() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useEngagementSurveys({ status: 'ACTIVE', limit: 50 });

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={(error as any)?.message || 'Gagal memuat survei'} onRetry={() => refetch()} />;

  const surveys = data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Survei</h1>
        <p className="text-sm text-muted-foreground">Isi survei yang tersedia untuk Anda</p>
      </div>

      {(!Array.isArray(surveys) || surveys.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-3" />
            <p>Tidak ada survei aktif saat ini.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(Array.isArray(surveys) ? surveys : []).map((s: any) => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm">{s.title}</CardTitle>
                <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {new Date(s.startDate).toLocaleDateString('id-ID')} - {new Date(s.endDate).toLocaleDateString('id-ID')}
              </p>
              <p className="text-xs text-muted-foreground">{s.questions?.length ?? 0} pertanyaan</p>
              <Button size="sm" className="w-full" onClick={() => router.push(`/ess/surveys/${s.id}`)}>
                Isi Survei <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
