'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useRoles,
  useCreateRole,
  useDeleteRole,
  usePermissions,
  useAssignPermission,
  useRemovePermission,
  useAssignRoleToUser,
  useRemoveRoleFromUser,
  useUsers,
} from '@/lib/hooks/admin';
import { createRoleSchema, type CreateRoleInput } from '@/lib/schemas/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Shield, Trash2, KeyRound, Users, X } from 'lucide-react';

export default function RolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permDialog, setPermDialog] = useState<{ roleId: string; name: string } | null>(null);
  const [userDialog, setUserDialog] = useState<{ roleId: string; name: string } | null>(null);

  const { data: roles = [], isLoading, error, refetch } = useRoles();
  const { data: permissions = [] } = usePermissions();
  const createMutation = useCreateRole();
  const deleteMutation = useDeleteRole();
  const assignPermMutation = useAssignPermission();
  const removePermMutation = useRemovePermission();

  const form = useForm<CreateRoleInput>({ resolver: zodResolver(createRoleSchema) });

  async function onSubmit(data: CreateRoleInput) {
    createMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role &amp; Permission</h1>
          <p className="text-sm text-muted-foreground">Kelola role dan hak akses pengguna</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Role Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Role Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Nama Role</Label>
                <Input id="role-name" placeholder="e.g. HR Manager" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-desc">Deskripsi</Label>
                <Input id="role-desc" placeholder="Deskripsi role" {...form.register('description')} />
                {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={3} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && roles.length === 0 && (
        <EmptyState
          title="Belum ada role"
          description="Buat role pertama untuk mengatur hak akses."
        />
      )}

      {!isLoading && !error && roles.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role: any) => {
            const perms = role.rolePermissions?.map((rp: any) => rp.permission) ?? [];
            return (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{role.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setPermDialog({ roleId: role.id, name: role.name })}
                        aria-label="Atur permission"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setUserDialog({ roleId: role.id, name: role.name })}
                        aria-label="Atur user"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon" aria-label="Hapus"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm('Hapus role ini?')) deleteMutation.mutate(role.id, { onSuccess: () => refetch() });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {perms.length > 0 ? (
                      perms.slice(0, 8).map((p: any) => {
                        const key = `${p.module}:${p.action}`;
                        return (
                          <Badge key={key} variant="secondary" className="text-[10px] flex items-center gap-1">
                            {key}
                            <button
                              type="button"
                              className="ml-0.5 hover:text-destructive"
                              aria-label={`Hapus ${key}`}
                              onClick={() =>
                                removePermMutation.mutate(
                                  { roleId: role.id, permissionId: p.id },
                                  { onSuccess: () => refetch() },
                                )
                              }
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground">Belum ada permission</p>
                    )}
                    {perms.length > 8 && (
                      <Badge variant="outline" className="text-[10px]">+{perms.length - 8}</Badge>
                    )}
                  </div>
                  {role.userRoles?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {role.userRoles.length} user terikat
                    </p>
                  )}
                  {role.isSystem && (
                    <p className="text-xs text-muted-foreground mt-2 italic">System role</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {permDialog && (
        <AssignPermissionDialog
          roleId={permDialog.roleId}
          roleName={permDialog.name}
          catalog={permissions}
          onClose={() => setPermDialog(null)}
          onSaved={() => { setPermDialog(null); refetch(); }}
        />
      )}

      {userDialog && (
        <UserRoleDialog
          roleId={userDialog.roleId}
          roleName={userDialog.name}
          onClose={() => setUserDialog(null)}
          onSaved={() => { setUserDialog(null); refetch(); }}
        />
      )}
    </div>
  );
}

function AssignPermissionDialog({
  roleId,
  roleName,
  catalog,
  onClose,
  onSaved,
}: {
  roleId: string;
  roleName: string;
  catalog: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [scope, setScope] = useState<'ALL' | 'OWN' | 'DEPARTMENT'>('ALL');
  const mutation = useAssignPermission();

  const modules = Array.from(new Set(catalog.map((p) => p.module))).sort();

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function submit() {
    if (selected.length === 0) return;
    mutation.mutate(
      { roleId, permissionKeys: selected, scope },
      { onSuccess: () => onSaved() },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atur Permission — {roleName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Scope</Label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">ALL</option>
              <option value="OWN">OWN</option>
              <option value="DEPARTMENT">DEPARTMENT</option>
            </select>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border p-2">
            {modules.map((mod) => (
              <div key={mod} className="mb-2">
                <p className="px-1 text-xs font-semibold uppercase text-muted-foreground">{mod}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {catalog
                    .filter((p) => p.module === mod)
                    .map((p) => {
                      const key = `${p.module}:${p.action}`;
                      const active = selected.includes(key);
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => toggle(key)}
                          className={`rounded px-2 py-1 text-[11px] border transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:border-primary'
                          }`}
                        >
                          {p.action}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Terpilih: {selected.length}</p>
          <Button onClick={submit} disabled={mutation.isPending || selected.length === 0} className="w-full">
            {mutation.isPending ? 'Menyimpan…' : 'Simpan Permission'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserRoleDialog({
  roleId,
  roleName,
  onClose,
  onSaved,
}: {
  roleId: string;
  roleName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState('');
  const assignMutation = useAssignRoleToUser();
  const removeMutation = useRemoveRoleFromUser();
  const { data: users = [] } = useUsers();

  function submit() {
    if (!email) return;
    const match = (users as any[]).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!match) {
      alert('User dengan email tersebut tidak ditemukan di tenant ini.');
      return;
    }
    assignMutation.mutate(
      { userId: match.id, roleId },
      { onSuccess: () => { setEmail(''); onSaved(); } },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur User — {roleName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Email user</Label>
            <div className="flex gap-2">
              <Input
                placeholder="user@nusantarasejahtera.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={submit} disabled={assignMutation.isPending}>
                Tambah
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">User terikat:</p>
            {(users as any[]).filter((u: any) => (u.userRoles ?? []).some((ur: any) => ur.roleId === roleId)).length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada user.</p>
            ) : (
              (users as any[])
                .filter((u: any) => (u.userRoles ?? []).some((ur: any) => ur.roleId === roleId))
                .map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <span>{u.fullName || u.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={removeMutation.isPending}
                      onClick={() =>
                        removeMutation.mutate({ userId: u.id, roleId }, { onSuccess: () => onSaved() })
                      }
                    >
                      Lepas
                    </Button>
                  </div>
                ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
