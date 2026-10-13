'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTasks, useTaskStats, useCreateTask, useUpdateTask, useDeleteTask, useProjects } from '@/lib/hooks/tasks';
import { useEmployees } from '@/lib/hooks/employees';
import { TASK_STATUSES, TASK_PRIORITIES, taskStatusLabels, priorityLabels } from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, SquareKanban, FolderKanban, CalendarRange } from 'lucide-react';

import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';

function formatDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(t: any) {
  return (
    t.status !== 'DONE' &&
    !!t.dueDate &&
    new Date(t.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  );
}

function TasksInner() {
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formProject, setFormProject] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data, isLoading, error, refetch } = useTasks({
    status: status || undefined,
    projectId: projectId || undefined,
    q: q.trim() || undefined,
    page,
    limit: 20,
  });
  const { data: stats } = useTaskStats();
  const { data: projectsPage } = useProjects({ limit: 100 });
  const { data: employeesPage } = useEmployees({ limit: 100 });
  const { allowed: canCreate } = usePermission('tasks:create');
  const { allowed: canManage } = usePermission('tasks:manage');

  const createM = useCreateTask();
  const updateM = useUpdateTask();
  const deleteM = useDeleteTask();

  const items = data?.items ?? [];
  const projects: any[] = (projectsPage as any)?.items ?? [];
  const employees: any[] = (employeesPage as any)?.data ?? [];

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFormProject('');
    setPriority('MEDIUM');
    setAssignee('');
    setDueDate('');
  };

  const submit = () => {
    if (!title.trim()) return;
    createM.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: formProject || undefined,
        priority: priority as any,
        assigneeEmployeeId: assignee || undefined,
        dueDate: dueDate || undefined,
      },
      {
        onSuccess: () => {
          setShowNew(false);
          resetForm();
          refetch();
        },
      },
    );
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task &amp; Project</h1>
          <p className="text-sm text-muted-foreground">Kelola tugas tim, project, dan progres pengerjaan</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks/board">
            <Button variant="outline">
              <SquareKanban className="mr-2 h-4 w-4" />Papan Kanban
            </Button>
          </Link>
          <Link href="/tasks/gantt">
            <Button variant="outline">
              <CalendarRange className="mr-2 h-4 w-4" />Gantt Chart
            </Button>
          </Link>
          {canManage && (
            <Link href="/tasks/projects">
              <Button variant="outline">
                <FolderKanban className="mr-2 h-4 w-4" />Project
              </Button>
            </Link>
          )}
          {canCreate && (
            <Button onClick={() => setShowNew(true)}>
              <Plus className="mr-2 h-4 w-4" />Task Baru
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Total', stats.total ?? 0],
            ['Dikerjakan', stats.byStatus?.IN_PROGRESS ?? 0],
            ['Selesai', stats.byStatus?.DONE ?? 0],
            ['Terlambat', stats.overdue ?? 0],
          ].map(([l, v]) => (
            <Card key={l as string}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{v as number}</p>
                <p className="text-xs text-muted-foreground">{l as string}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-56"
          placeholder="Cari judul task…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter status"
          className="rounded-md border px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {taskStatusLabels[s]}
            </option>
          ))}
        </select>
        {canManage && (
          <select
            aria-label="Filter project"
            className="rounded-md border px-3 py-2 text-sm"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {isLoading && <TableSkeleton columns={5} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="Belum ada task" description="Buat task baru atau ubah filter pencarian." />
      )}
      {!isLoading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                {canCreate && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/tasks/${t.id}`} className="font-medium text-primary hover:underline">
                      {t.title}
                    </Link>
                    {(t.subtasks?.length ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground">{t.subtasks.length} subtask</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.project?.name ?? '—'}</TableCell>
                  <TableCell>{t.assignee?.fullName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'warning' : 'secondary'}>
                      {priorityLabels[t.priority] ?? t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className={isOverdue(t) ? 'font-medium text-destructive' : ''}>
                    {formatDate(t.dueDate)}
                  </TableCell>
                  <TableCell>
                    {canCreate ? (
                      <select
                        aria-label={`Ubah status ${t.title}`}
                        className="rounded-md border px-2 py-1 text-xs"
                        value={t.status}
                        disabled={updateM.isPending}
                        onChange={(e) =>
                          updateM.mutate(
                            { id: t.id, data: { status: e.target.value as any } },
                            { onSuccess: () => refetch() },
                          )
                        }
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {taskStatusLabels[s]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant={t.status === 'DONE' ? 'success' : 'secondary'}>
                        {taskStatusLabels[t.status] ?? t.status}
                      </Badge>
                    )}
                  </TableCell>
                  {canCreate && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteM.isPending}
                        onClick={() => {
                          if (!window.confirm(`Hapus task "${t.title}"?`)) return;
                          deleteM.mutate(t.id, { onSuccess: () => refetch() });
                        }}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Halaman {data.page} dari {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowNew(false)}
        >
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-lg font-semibold">Task Baru</h2>
              <Input placeholder="Judul task" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Deskripsi (opsional)…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Project"
                  className="rounded-md border px-3 py-2 text-sm"
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                >
                  <option value="">— Tanpa project —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Prioritas"
                  className="rounded-md border px-3 py-2 text-sm"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {priorityLabels[p]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Assignee"
                  className="rounded-md border px-3 py-2 text-sm"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">— Belum diassign —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  aria-label="Jatuh tempo"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              {createM.error && <p className="text-sm text-destructive">{(createM.error as Error).message}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNew(false)}>
                  Batal
                </Button>
                <Button onClick={submit} disabled={createM.isPending || !title.trim()}>
                  {createM.isPending ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <RequirePermission permission="tasks:view">
      <TasksInner />
    </RequirePermission>
  );
}

