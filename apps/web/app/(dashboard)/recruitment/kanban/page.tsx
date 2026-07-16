'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePipeline, useUpdateApplicationStage } from '@/lib/hooks/recruitment';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import { User, Clock, FileText } from 'lucide-react';

const STAGES = [
  { key: 'NEW', label: 'Applied' },
  { key: 'SCREENING', label: 'Screening' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFER', label: 'Offering' },
  { key: 'ACCEPTED', label: 'Hired' },
];

export default function RecruitmentKanbanPage() {
  const { data: pipeline, isLoading, error, refetch } = usePipeline();
  const updateStage = useUpdateApplicationStage();
  const [dragId, setDragId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruitment Pipeline</h1>
          <p className="text-sm text-muted-foreground">Kelola kandidat di setiap tahap rekrutmen</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <div key={s.key} className="min-w-[220px] flex-1 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState onRetry={() => refetch()} />;

  const columns = STAGES.map((stage) => ({
    ...stage,
    items: (pipeline?.[stage.key] as any[]) ?? [],
  }));

  const totalCards = columns.reduce((acc, c) => acc + c.items.length, 0);

  if (totalCards === 0) {
    return <EmptyState title="Pipeline kosong" description="Belum ada kandidat di pipeline rekrutmen." />;
  }

  const handleDrop = async (stageKey: string) => {
    if (!dragId) return;
    await updateStage.mutateAsync({ id: dragId, status: stageKey });
    setDragId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recruitment Pipeline</h1>
        <p className="text-sm text-muted-foreground">Kelola kandidat di setiap tahap rekrutmen</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
            className="flex min-w-[240px] flex-1 flex-col rounded-lg bg-muted/40 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{col.label}</h2>
              <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
            </div>

            <div className="space-y-2">
              {col.items.map((app: any) => (
                <Card
                  key={app.id}
                  draggable
                  onDragStart={() => setDragId(app.id)}
                  className="cursor-grab p-3 active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {app.candidate?.firstName} {app.candidate?.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.jobPosting?.title ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {app.appliedAt
                        ? new Date(app.appliedAt).toLocaleDateString('id-ID')
                        : ''}
                    </span>
                    {col.key === 'OFFER' && (
                      <Badge variant="warning" className="text-[10px]">Menunggu e-signature</Badge>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <Link href={`/applications/${app.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">Detail</Button>
                    </Link>
                  </div>
                </Card>
              ))}

              {col.items.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada kandidat</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
