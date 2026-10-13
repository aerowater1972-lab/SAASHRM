'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useAddTaskComment,
  useLogTaskHours,
  useCreateTask,
  useProjects,
} from '@/lib/hooks/tasks';
import { useEmployees } from '@/lib/hooks/employees';
import { TASK_STATUSES, TASK_PRIORITIES, taskStatusLabels, priorityLabels } from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';

import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';

function fmt(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function TaskDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const { data: t, isLoading, error, refetch } = useTask(id);
  const { allowed: canCreate } = usePermission('tasks:create');
  const { data: projectsPage } = useProjects({ limit: 100 }, canCreate);
  const { data: employeesPage } = useEmployees({ limit: 100 }, canCreate);

  const [content, setContent] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [hours, setHours] = useState('');

  const updateM = useUpdateTask();
  const deleteM = useDeleteTask();
  const commentM = useAddTaskComment();
  const logM = useLogTaskHours();
  const createM = useCreateTask();

  const projects: any[] = (projectsPage as any)?.items ?? [];
  const employees: any[] = (employeesPage as any)?.data ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!t) return <p className="text-sm text-destructive">Task tidak ditemukan.</p>;

  const sendComment = () => {
    if (!content.trim()) return;
    commentM.mutate({ id, content: content.trim() }, { onSuccess: () => { setContent(''); refetch(); } });
  };

  const addSubtask = () => {
    if (!subtaskTitle.trim()) return;
    createM.mutate(
      {
        title: subtaskTitle.trim(),
        projectId: t.projectId ?? undefined,
        parentTaskId: id,
        priority: t.priority as any,
      },
      { onSuccess: () => { setSubtaskTitle(""); refetch(); } },
    );
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href="/tasks" className="text-sm text-muted-foreground hover:underline">
            ← Semua Task
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={t.status === "DONE" ? "success" : "secondary"}>
              {taskStatusLabels[t.status] ?? t.status}
            </Badge>
            <Badge variant={t.priority === "URGENT" || t.priority === "HIGH" ? "warning" : "secondary"}>
              {priorityLabels[t.priority] ?? t.priority}
            </Badge>
            {t.project && <Badge variant="outline">{t.project.name}</Badge>}
          </div>
        </div>
        {canCreate && (
          <Button
            variant="outline"
            size="sm"
            disabled={deleteM.isPending}
            onClick={() => {
              if (!window.confirm(`Hapus task "${t.title}"?`)) return;
              deleteM.mutate(id, { onSuccess: () => router.push("/tasks") });
            }}
          >
            Hapus
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-1 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Assignee:</span>{" "}
            {t.assignee?.fullName ?? <span className="text-destructive">Belum diassign</span>}
          </p>
          <p>
            <span className="text-muted-foreground">Reporter:</span> {t.reporter?.fullName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Jatuh tempo:</span> {fmt(t.dueDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Estimasi:</span>{" "}
            {t.estimateHours ? `${t.estimateHours} jam` : "—"} &middot;{" "}
            <span className="text-muted-foreground">Terpakai:</span> {t.loggedHours ? `${t.loggedHours} jam` : "—"}
          </p>
          {t.description && <p className="mt-2 whitespace-pre-wrap">{t.description}</p>}
        </CardContent>
      </Card>
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ubah Task</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <select
              aria-label="Status"
              className="rounded-md border px-2 py-1 text-sm"
              value={t.status}
              disabled={updateM.isPending}
              onChange={(e) =>
                updateM.mutate({ id, data: { status: e.target.value as any } }, { onSuccess: () => refetch() })
              }
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {taskStatusLabels[s]}
                </option>
              ))}
            </select>
            <select
              aria-label="Prioritas"
              className="rounded-md border px-2 py-1 text-sm"
              value={t.priority}
              disabled={updateM.isPending}
              onChange={(e) =>
                updateM.mutate({ id, data: { priority: e.target.value as any } }, { onSuccess: () => refetch() })
              }
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
            <select
              aria-label="Assignee"
              className="rounded-md border px-2 py-1 text-sm"
              value={t.assigneeEmployeeId ?? ""}
              disabled={updateM.isPending}
              onChange={(e) =>
                updateM.mutate(
                  { id, data: { assigneeEmployeeId: e.target.value || undefined } },
                  { onSuccess: () => refetch() },
                )
              }
            >
              <option value="">— Belum diassign —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
            <select
              aria-label="Project"
              className="rounded-md border px-2 py-1 text-sm"
              value={t.projectId ?? ""}
              disabled={updateM.isPending}
              onChange={(e) =>
                updateM.mutate(
                  { id, data: { projectId: e.target.value || undefined } },
                  { onSuccess: () => refetch() },
                )
              }
            >
              <option value="">— Tanpa project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              aria-label="Jatuh tempo"
              className="w-40"
              value={t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : ""}
              disabled={updateM.isPending}
              onChange={(e) =>
                updateM.mutate(
                  { id, data: { dueDate: e.target.value || undefined } },
                  { onSuccess: () => refetch() },
                )
              }
            />
          </CardContent>
        </Card>
      )}
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4" />Catat Jam Kerja
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <Input
              type="number"
              min="0.25"
              step="0.25"
              className="w-28"
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={logM.isPending || !hours || Number(hours) <= 0}
              onClick={() =>
                logM.mutate({ id, hours: Number(hours) }, { onSuccess: () => { setHours(""); refetch(); } })
              }
            >
              {logM.isPending ? "Menyimpan…" : "Simpan Jam"}
            </Button>
            {logM.error && <p className="text-sm text-destructive">{(logM.error as Error).message}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Subtasks ({t.subtasks?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(t.subtasks ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <Link href={`/tasks/${s.id}`} className="text-primary hover:underline">
                {s.title}
              </Link>
              <Badge variant={s.status === "DONE" ? "success" : "secondary"}>
                {taskStatusLabels[s.status] ?? s.status}
              </Badge>
            </div>
          ))}
          {canCreate && (
            <div className="flex gap-2">
              <Input
                placeholder="Tambah subtask…"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
              />
              <Button variant="outline" disabled={createM.isPending || !subtaskTitle.trim()} onClick={addSubtask}>
                Tambah
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="font-semibold">Komentar ({t.comments?.length ?? 0})</h2>
      <div className="space-y-2">
        {(t.comments ?? []).map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">
                {c.authorEmployee?.fullName || c.authorUser?.fullName || "Pengguna"} &middot; {fmt(c.createdAt)}
              </p>
              <p className="mt-1">{c.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {canCreate && (
        <div className="flex gap-2">
          <Input placeholder="Tulis komentar…" value={content} onChange={(e) => setContent(e.target.value)} />
          <Button onClick={sendComment} disabled={commentM.isPending || !content.trim()}>
            Kirim
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams() as { id: string };
  return (
    <RequirePermission permission="tasks:view">
      <TaskDetailInner id={id} />
    </RequirePermission>
  );
}
