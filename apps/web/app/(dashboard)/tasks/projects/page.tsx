'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/tasks';
import { useUsers } from '@/lib/hooks/admin';
import { decodeToken } from '@/lib/api';
import {
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  projectStatusLabels,
  priorityLabels,
} from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus } from 'lucide-react';

import { RequirePermission } from '@/components/require-permission';
import { usePermission } from '@/lib/hooks/use-permission';

function fmt(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ProjectsInner() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, error, refetch } = useProjects({
    status: status || undefined,
    q: q.trim() || undefined,
    page,
    limit: 20,
  });
  const { data: usersPage } = useUsers({ limit: 100 });
  const { allowed: canManage } = usePermission('tasks:manage');

  const createM = useCreateProject();
  const updateM = useUpdateProject();
  const deleteM = useDeleteProject();

  const items = data?.items ?? [];
  const users: any[] = (usersPage as any)?.data ?? [];
  const me = decodeToken();

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setOwnerUserId('');
    setPriority('MEDIUM');
    setStartDate('');
    setEndDate('');
  };

  const submit = () => {
    const owner = ownerUserId || me?.sub;
    if (!name.trim() || !code.trim() || !owner) return;
    createM.mutate(
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        ownerUserId: owner,
        priority: priority as any,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
      { onSuccess: () => { setShowNew(false); resetForm(); refetch(); } },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project</h1>
          <p className="text-sm text-muted-foreground">Daftar project dan progres task di dalamnya</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tasks/board" className="text-sm text-primary hover:underline">
            Papan Kanban
          </Link>
          {canManage && (
            <Button onClick={() => setShowNew(true)}>
              <Plus className="mr-2 h-4 w-4" />Project Baru
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-56"
          placeholder="Cari nama/kode project…"
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
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {projectStatusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <TableSkeleton columns={5} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="Belum ada project" description="Buat project baru untuk mengelompokkan task tim." />
      )}
      {!isLoading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Pemilik</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/tasks/projects/${p.id}`} className="font-medium text-primary hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.code}</p>
                  </TableCell>
                  <TableCell>{p.owner?.fullName ?? '—'}</TableCell>
                  <TableCell>{p._count?.tasks ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmt(p.startDate)} — {fmt(p.endDate)}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <select
                        aria-label={`Ubah status ${p.name}`}
                        className="rounded-md border px-2 py-1 text-xs"
                        value={p.status}
                        disabled={updateM.isPending}
                        onChange={(e) =>
                          updateM.mutate(
                            { id: p.id, data: { status: e.target.value as any } },
                            { onSuccess: () => refetch() },
                          )
                        }
                      >
                        {PROJECT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {projectStatusLabels[s]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant={p.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {projectStatusLabels[p.status] ?? p.status}
                      </Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteM.isPending}
                        onClick={() => {
                          if (!window.confirm(`Hapus project "${p.name}"? Task di dalamnya ikut terhapus.`)) return;
                          deleteM.mutate(p.id, { onSuccess: () => refetch() });
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
          <Card className="w-full max-w-lg" onClick={(ev) => ev.stopPropagation()}>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-lg font-semibold">Project Baru</h2>
              <Input placeholder="Nama project" value={name} onChange={(ev) => setName(ev.target.value)} />
              <Input
                placeholder="Kode project (unik), mis. PRJ-2026-01"
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
              />
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Deskripsi (opsional)…"
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Pemilik project"
                  className="rounded-md border px-3 py-2 text-sm"
                  value={ownerUserId}
                  onChange={(ev) => setOwnerUserId(ev.target.value)}
                >
                  <option value="">— Saya sebagai pemilik —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Prioritas"
                  className="rounded-md border px-3 py-2 text-sm"
                  value={priority}
                  onChange={(ev) => setPriority(ev.target.value)}
                >
                  {PROJECT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {priorityLabels[p]}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  aria-label="Tanggal mulai"
                  value={startDate}
                  onChange={(ev) => setStartDate(ev.target.value)}
                />
                <Input
                  type="date"
                  aria-label="Tanggal selesai"
                  value={endDate}
                  onChange={(ev) => setEndDate(ev.target.value)}
                />
              </div>
              {createM.error && <p className="text-sm text-destructive">{(createM.error as Error).message}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNew(false)}>
                  Batal
                </Button>
                <Button onClick={submit} disabled={createM.isPending || !name.trim() || !code.trim()}>
                  {createM.isPending ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <RequirePermission permission="tasks:manage">
      <ProjectsInner />
    </RequirePermission>
  );
}
