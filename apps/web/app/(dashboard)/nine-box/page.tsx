'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { useNineBoxMatrix, useTalentPools } from '@/lib/hooks/use-succession';
import type { TalentPool } from '@/lib/api/succession';

const BOX_COLOR: Record<string, string> = {
  'HIGH|HIGH': 'bg-emerald-100 dark:bg-emerald-950',
  'HIGH|MID': 'bg-emerald-50 dark:bg-emerald-950/50',
  'MID|HIGH': 'bg-emerald-50 dark:bg-emerald-950/50',
  'MID|MID': 'bg-amber-50 dark:bg-amber-950/50',
  'LOW|LOW': 'bg-red-100 dark:bg-red-950',
};

export default function NineBoxPage() {
  const [poolId, setPoolId] = useState<string>('');
  const { data: pools = [] } = useTalentPools();
  const { data, isLoading, error } = useNineBoxMatrix(poolId || undefined);
  const poolList = (pools ?? []) as TalentPool[];

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Gagal memuat matriks'} />;
  if (!data) return <EmptyState title="Data tidak tersedia" description="Belum ada data talent pool." />;

  const ordered = [...(data.boxes ?? [])].sort((a: any, b: any) => {
    const rank = (v: string) => (v === 'HIGH' ? 0 : v === 'MID' ? 1 : 2);
    return rank(a.performance) - rank(b.performance) || rank(b.potential) - rank(a.potential);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">9-Box Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Talent mapping kinerja x potensi — {data.placed} ditempatkan, {data.unplaced?.length ?? 0} belum dinilai
          </p>
        </div>
        <select
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
        >
          <option value="">Semua pool</option>
          {poolList.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-6 overflow-x-auto">
          <div className="grid grid-cols-3 gap-2 min-w-[560px]">
            {ordered.map((box: any) => (
              <div
                key={`${box.performance}-${box.potential}`}
                className={`border rounded-lg p-3 min-h-[140px] ${BOX_COLOR[`${box.performance}|${box.potential}`] ?? 'bg-muted/30'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {box.performance} / {box.potential}
                  </span>
                  <Badge variant="secondary">{box.count}</Badge>
                </div>
                <div className="space-y-0.5 max-h-[90px] overflow-auto">
                  {(box.people ?? []).map((p: any) => (
                    <div key={p.memberId} className="text-xs truncate" title={p.fullName}>
                      {p.fullName ?? p.employeeCode ?? p.employeeId}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{box.action}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(data.unplaced?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Belum ditempatkan (lengkapi asesmen)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(data.unplaced as any[]).map((p: any) => (
                <Badge key={p.memberId} variant="outline">{p.fullName ?? p.employeeCode ?? p.employeeId}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
