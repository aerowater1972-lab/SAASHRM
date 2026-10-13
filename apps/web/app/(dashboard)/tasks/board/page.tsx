'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTasks, useUpdateTask, useProjects } from '@/lib/hooks/tasks';
import { KANBAN_COLUMNS, taskStatusLabels, priorityLabels } from '@/lib/api/tasks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/data-states';

import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';

function fmt(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function isOverdue(t: any) {
  return t.status !== 'DONE' && !!t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
}

function BoardInner() {
  const [projectId, setProjectId] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const { allowed: canCreate } = usePermission('tasks:create');
  const { data: projectsPage } = useProjects({ limit: 100 }, canCreate);
  const { data, isLoading, error, refetch } = useTasks({
    projectId: projectId || undefined,
    limit: 100,
  });
  const updateM = useUpdateTask();

  const projects: any[] = (projectsPage as any)?.items ?? [];
  const items: any[] = data?.items ?? [];
  const columns = KANBAN_COLUMNS.map((key) => ({ key, items: items.filter((t: any) => t.status === key) }));
  const blocked = items.filter((t: any) => t.status === 'BLOCKED');

  const handleDrop = async (status: string) => {
    if (!dragId) return;
    await updateM.mutateAsync({ id: dragId, data: { status: status as any } });
    setDragId(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Papan Kanban</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((c) => (
            <div key={c} className="min-w-[220px] flex-1 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Papan Kanban</h1>
          <p className="text-sm text-muted-foreground">Geser kartu untuk mengubah status task</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <select
              aria-label="Filter project"
              className="rounded-md border px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Semua project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Link href="/tasks" className="text-sm text-primary hover:underline">
            Tampilan Tabel
          </Link>
          <Link href="/tasks/gantt" className="text-sm text-primary hover:underline">
            Gantt Chart
          </Link>
        </div>
      </div>

      {items.length === 0 && <EmptyState title="Papan kosong" description="Belum ada task untuk ditampilkan." />}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
            className="flex min-w-[240px] flex-1 flex-col rounded-lg bg-muted/40 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{taskStatusLabels[col.key] ?? col.key}</h2>
              <Badge variant="secondary" className="text-xs">
                {col.items.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {col.items.map((t: any) => (
                <Card
                  key={t.id}
                  draggable={canCreate}
                  onDragStart={() => setDragId(t.id)}
                  className={canCreate ? 'cursor-grab p-3 active:cursor-grabbing' : 'p-3'}
                >
                  <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:underline">
                    {t.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Badge
                      variant={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'warning' : 'secondary'}
                      className="text-[10px]"
                    >
                      {priorityLabels[t.priority] ?? t.priority}
                    </Badge>
                    {t.project && (
                      <Badge variant="outline" className="text-[10px]">
                        {t.project.name}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.assignee?.fullName ?? 'Belum diassign'}</span>
                    <span className={isOverdue(t) ? 'font-medium text-destructive' : ''}>{fmt(t.dueDate)}</span>
                  </div>
                </Card>
              ))}
              {col.items.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada task</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {blocked.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <p className="text-sm font-semibold">Terhambat ({blocked.length})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {blocked.map((t: any) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="text-sm text-primary hover:underline">
                {t.title}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function TaskBoardPage() {
  return (
    <RequirePermission permission="tasks:view">
      <BoardInner />
    </RequirePermission>
  );
}
