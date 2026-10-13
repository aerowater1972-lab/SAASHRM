'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProject, useAddProjectMember, useUpdateProject } from '@/lib/hooks/tasks';
import { useEmployees } from '@/lib/hooks/employees';
import {
  PROJECT_STATUSES,
  PROJECT_MEMBER_ROLES,
  projectStatusLabels,
  priorityLabels,
  taskStatusLabels,
} from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/data-states';

import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';

function fmt(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ProjectDetailInner({ id }: { id: string }) {
  const { data: p, isLoading, error, refetch } = useProject(id);
  const { allowed: canManage } = usePermission('tasks:manage');
  const { data: employeesPage } = useEmployees({ limit: 100 }, canManage);
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('MEMBER');

  const addMemberM = useAddProjectMember();
  const updateM = useUpdateProject();

  const employees: any[] = (employeesPage as any)?.data ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!p) return <p className="text-sm text-destructive">Project tidak ditemukan.</p>;

  const tasks: any[] = p.tasks ?? [];
  const done = tasks.filter((t: any) => t.status === 'DONE').length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const addMember = () => {
    if (!employeeId) return;
    addMemberM.mutate({ id, data: { employeeId, role } }, { onSuccess: () => { setEmployeeId(''); refetch(); } });
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <Link href="/tasks/projects" className="text-sm text-muted-foreground hover:underline">
          ← Semua Project
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
            <p className="text-xs text-muted-foreground">
              {p.code} &middot; Pemilik: {p.owner?.fullName ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={p.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {projectStatusLabels[p.status] ?? p.status}
            </Badge>
            <Badge variant="secondary">{priorityLabels[p.priority] ?? p.priority}</Badge>
            {canManage && (
              <select
                aria-label="Ubah status project"
                className="rounded-md border px-2 py-1 text-xs"
                value={p.status}
                disabled={updateM.isPending}
                onChange={(e) =>
                  updateM.mutate({ id, data: { status: e.target.value as any } }, { onSuccess: () => refetch() })
                }
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {projectStatusLabels[s]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {p.description && (
        <Card>
          <CardContent className="p-4 text-sm whitespace-pre-wrap">{p.description}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progres: {done}/{tasks.length} task selesai</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            Periode: {fmt(p.startDate)} — {fmt(p.endDate)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anggota ({p.members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(p.members ?? []).map((m: any) => (
              <Badge key={m.id} variant="outline">
                {m.employee?.fullName ?? m.employeeId} &middot; {m.role}
              </Badge>
            ))}
            {(p.members?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">Belum ada anggota.</p>}
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Pilih karyawan"
                className="rounded-md border px-2 py-1 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">— Pilih karyawan —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
              <select
                aria-label="Peran anggota"
                className="rounded-md border px-2 py-1 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {PROJECT_MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={addMemberM.isPending || !employeeId} onClick={addMember}>
                {addMemberM.isPending ? 'Menyimpan…' : 'Tambah Anggota'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Task ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <Link href={`/tasks/${t.id}`} className="text-primary hover:underline">
                {t.title}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.assignee?.fullName ?? '—'}</span>
                <Badge variant={t.status === 'DONE' ? 'success' : 'secondary'}>
                  {taskStatusLabels[t.status] ?? t.status}
                </Badge>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-xs text-muted-foreground">Belum ada task di project ini.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  return (
    <RequirePermission permission="tasks:view">
      <ProjectDetailInner id={id} />
    </RequirePermission>
  );
}
