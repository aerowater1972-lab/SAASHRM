'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useGanttBoard, useProjects } from '@/lib/hooks/tasks';
import { taskStatusLabels } from '@/lib/api/tasks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/data-states';

import { RequirePermission } from '@/components/require-permission';

// ---- Konstanta layout ----
const DAY = 86_400_000;
const DAY_WIDTH = 36; // px per hari
const ROW_H = 44; // tinggi satu baris task
const HEADER_H = 52;
const LABEL_W = 264; // lebar kolom label task (sticky kiri)

const STATUS_BAR: Record<string, string> = {
  BACKLOG: 'bg-slate-400',
  TODO: 'bg-slate-500',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-amber-500',
  DONE: 'bg-green-500',
  BLOCKED: 'bg-red-500',
};

const LEGEND: { key: string; cls: string }[] = [
  { key: 'BACKLOG', cls: STATUS_BAR.BACKLOG },
  { key: 'TODO', cls: STATUS_BAR.TODO },
  { key: 'IN_PROGRESS', cls: STATUS_BAR.IN_PROGRESS },
  { key: 'IN_REVIEW', cls: STATUS_BAR.IN_REVIEW },
  { key: 'DONE', cls: STATUS_BAR.DONE },
  { key: 'BLOCKED', cls: STATUS_BAR.BLOCKED },
];

function startOfDay(d: Date | string) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function dayDiff(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

/**
 * Model Task tidak punya startDate. Turunkan rentang bar:
 * - start = createdAt (anchor pasti ada)
 * - end   = completedAt (jika DONE) | dueDate | createdAt + durasi estimasi (min 1 hari)
 */
function computeEnd(t: any): Date {
  if (t.status === 'DONE' && t.completedAt) return startOfDay(t.completedAt);
  if (t.dueDate) return startOfDay(t.dueDate);
  const created = startOfDay(t.createdAt);
  const hours = typeof t.estimateHours === 'number' ? t.estimateHours : 8;
  const days = Math.max(1, Math.ceil(hours / 8));
  return addDays(created, days - 1);
}

function GanttInner() {
  const [projectId, setProjectId] = useState('');
  const { data: projectsPage } = useProjects({ limit: 100 });
  const { data, isLoading, error, refetch } = useGanttBoard(projectId || undefined);

  const tasks: any[] = data?.tasks ?? [];
  const dependencies: any[] = data?.dependencies ?? [];
  const projects: any[] = (projectsPage as any)?.items ?? [];

  // Hitung posisi & rentang timeline.
  const model = useMemo(() => {
    if (tasks.length === 0) {
      return { rows: [] as any[], totalDays: 1, timelineStart: startOfDay(new Date()), arrows: [] as any[] };
    }
    const positioned = tasks.map((t) => {
      const start = startOfDay(t.createdAt ?? new Date());
      let end = computeEnd(t);
      if (end.getTime() < start.getTime()) end = start; // jaga urutan
      return { task: t, start, end };
    });

    const timelineStart = positioned.reduce(
      (min, p) => (p.start.getTime() < min.getTime() ? p.start : min),
      positioned[0].start,
    );
    const timelineEnd = positioned.reduce(
      (max, p) => (p.end.getTime() > max.getTime() ? p.end : max),
      positioned[0].end,
    );
    const paddedEnd = addDays(timelineEnd, 2);
    const totalDays = Math.max(1, dayDiff(timelineStart, paddedEnd) + 1);

    const indexById = new Map<string, number>();
    const rows = positioned.map((p, i) => {
      indexById.set(p.task.id, i);
      const from = dayDiff(timelineStart, p.start);
      const to = dayDiff(timelineStart, p.end);
      const left = from * DAY_WIDTH;
      const width = Math.max(24, (to - from + 1) * DAY_WIDTH);
      return { task: p.task, left, width };
    });

    // Panah dependency: blocker (dependsOnTaskId) -> blocked (taskId)
    const arrows: any[] = [];
    for (const dep of dependencies) {
      const bi = indexById.get(dep.dependsOnTaskId);
      const ti = indexById.get(dep.taskId);
      if (bi === undefined || ti === undefined) continue;
      const blocker = rows[bi];
      const blocked = rows[ti];
      arrows.push({
        id: dep.id,
        x1: blocker.left + blocker.width,
        y1: bi * ROW_H + ROW_H / 2,
        x2: blocked.left,
        y2: ti * ROW_H + ROW_H / 2,
      });
    }

    return { rows, totalDays, timelineStart, arrows };
  }, [tasks, dependencies]);

  const todayOffset = useMemo(
    () => dayDiff(model.timelineStart, new Date()) * DAY_WIDTH + DAY_WIDTH / 2,
    [model.timelineStart],
  );

  const timelineWidth = model.totalDays * DAY_WIDTH;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Gantt Chart</h1>
        <Card className="p-4">
          <Skeleton className="h-10 w-64" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gantt Chart</h1>
          <p className="text-sm text-muted-foreground">Linimasa tugas &amp; dependensi antar task</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Link href="/tasks/board">
            <Button variant="outline" size="sm">
              Papan Kanban
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              Tampilan Tabel
            </Button>
          </Link>
        </div>
      </div>

      {/* Legenda status */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {LEGEND.map((l) => (
          <span key={l.key} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-4 rounded-sm ${l.cls}`} />
            {taskStatusLabels[l.key] ?? l.key}
          </span>
        ))}
        <span className="ml-2 inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-destructive" />
          Hari ini
        </span>
      </div>
      {/* Gantt grid */}
      {tasks.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="Belum ada task"
            description="Tidak ada task pada rentang/filter ini. Ubah filter project atau tambahkan task terlebih dahulu."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="relative" style={{ minWidth: LABEL_W + timelineWidth }}>
              {/* Header tanggal */}
              <div className="sticky top-0 z-20 flex border-b bg-background" style={{ height: HEADER_H }}>
                <div
                  className="sticky left-0 z-30 flex items-center border-r bg-muted/60 px-3 text-sm font-medium"
                  style={{ width: LABEL_W, height: HEADER_H }}
                >
                  Tugas ({model.rows.length})
                </div>
                <div className="relative" style={{ width: timelineWidth, height: HEADER_H }}>
                  {Array.from({ length: model.totalDays }).map((_, i) => {
                    const d = addDays(model.timelineStart, i);
                    const wk = ['M', 'S', 'S', 'R', 'K', 'J', 'S'][d.getDay()];
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 border-r text-center ${isWeekend ? 'bg-muted/40' : ''}`}
                        style={{ left: i * DAY_WIDTH, width: DAY_WIDTH, height: HEADER_H }}
                      >
                        <div className="pt-1 text-[11px] font-medium leading-none">{d.getDate()}</div>
                        <div className="mt-1 text-[9px] uppercase leading-none text-muted-foreground">{wk}</div>
                      </div>
                    );
                  })}
                  {todayOffset >= 0 && todayOffset <= timelineWidth && (
                    <div className="absolute bottom-0 top-0 w-0.5 bg-destructive" style={{ left: todayOffset }} />
                  )}
                </div>
              </div>

              {/* Body baris task */}
              <div className="relative" style={{ height: model.rows.length * ROW_H }}>
                {todayOffset >= 0 && todayOffset <= timelineWidth && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-destructive"
                    style={{ left: LABEL_W + todayOffset }}
                  />
                )}
                {model.rows.map((r, i) => (
                  <div key={r.task.id} className="absolute left-0 flex" style={{ top: i * ROW_H, width: '100%', height: ROW_H }}>
                    <div
                      className="sticky left-0 z-20 flex items-center gap-2 border-r bg-background px-3 text-sm"
                      style={{ width: LABEL_W, height: ROW_H }}
                    >
                      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_BAR[r.task.status]}`} />
                      <span className="truncate" title={r.task.title}>
                        {r.task.title}
                      </span>
                    </div>
                    <div className="relative" style={{ width: timelineWidth, height: ROW_H }}>
                      <div
                        className={`absolute top-2 flex items-center overflow-hidden rounded-md px-2 text-xs font-medium text-white shadow-sm ${STATUS_BAR[r.task.status]}`}
                        style={{ left: r.left, width: r.width, height: ROW_H - 16 }}
                        title={`${r.task.title} — ${taskStatusLabels[r.task.status] ?? r.task.status}`}
                      >
                        <span className="truncate">{r.task.title}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Panah dependency (blocker -> blocked) */}
                <svg
                  className="pointer-events-none absolute left-0 top-0 z-[5] text-muted-foreground"
                  width={LABEL_W + timelineWidth}
                  height={model.rows.length * ROW_H}
                >
                  <defs>
                    <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {model.arrows.map((a) => {
                    const ax1 = LABEL_W + a.x1;
                    const ax2 = LABEL_W + a.x2;
                    const midX = ax1 + 8;
                    const path =
                      a.y1 === a.y2
                        ? `M ${ax1} ${a.y1} L ${ax2} ${a.y2}`
                        : `M ${ax1} ${a.y1} L ${midX} ${a.y1} L ${midX} ${a.y2} L ${ax2} ${a.y2}`;
                    return (
                      <path
                        key={a.id}
                        d={path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        markerEnd="url(#gantt-arrow)"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function GanttPage() {
  return (
    <RequirePermission permission="tasks:view">
      <GanttInner />
    </RequirePermission>
  );
}


