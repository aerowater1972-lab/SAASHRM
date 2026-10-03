'use client';

import { useState } from 'react';
import { useTrainingRecommendations } from '@/lib/hooks/use-idp';
import { EmployeeSearch } from '@/components/employee-search';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { BookOpen, Sparkles } from 'lucide-react';

export default function TrainingRecommendationsPage() {
  const [empId, setEmpId] = useState('');
  const [limit, setLimit] = useState(5);
  const { data: raw, isLoading, error, refetch } = useTrainingRecommendations(empId, limit);
  const d = (raw ?? {}) as any;
  const recs = (d.recommendations ?? []) as any[];
  const maxScore = Math.max(1, ...recs.map((r: any) => r.score ?? 0));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rekomendasi Training</h1>
        <p className="text-sm text-muted-foreground">TNA otomatis dari gap IDP + goal yang belum tercapai</p>
      </div>

      <div className="flex gap-2 flex-wrap items-end">
        <div className="max-w-xl flex-1 min-w-[240px]">
          <EmployeeSearch value={empId} onChange={(id) => setEmpId(id)} />
        </div>
        <select
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          aria-label="Jumlah rekomendasi"
        >
          {[5, 10, 20].map((n) => <option key={n} value={n}>Top {n}</option>)}
        </select>
      </div>

      {!empId && <EmptyState title="Pilih karyawan" description="Pilih karyawan untuk melihat rekomendasi training." />}
      {empId && isLoading && <TableSkeleton rows={3} columns={2} />}
      {empId && error && <ErrorState message="Gagal memuat rekomendasi" onRetry={() => refetch()} />}

      {empId && !isLoading && !error && (
        <>
          {(d.keywords ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">Kata kunci terdeteksi:</span>
              {(d.keywords as string[]).slice(0, 15).map((k) => (
                <Badge key={k} variant="outline">{k}</Badge>
              ))}
            </div>
          )}

          {recs.length === 0 ? (
            <EmptyState
              title="Belum ada rekomendasi"
              description="Tidak ada gap terdeteksi atau katalog belum memiliki training yang cocok."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recs.map((r: any) => (
                <Card key={r.training?.id ?? r.training?.title}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        {r.training?.title}
                      </CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        <Sparkles className="h-3 w-3 mr-1" /> {r.score}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      {r.training?.category && <Badge variant="outline">{r.training.category}</Badge>}
                      {r.training?.type && <Badge variant="outline">{r.training.type}</Badge>}
                      {r.training?.startDate && (
                        <span className="text-xs text-muted-foreground">
                          Mulai {String(r.training.startDate).slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.round(((r.score ?? 0) / maxScore) * 100)}%` }}
                      />
                    </div>
                    {(r.matched ?? []).length > 0 && (
                      <p className="text-xs text-muted-foreground">Cocok: {(r.matched as string[]).join(', ')}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
