'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useActivateUser,
  useResetUserPassword,
} from '@/lib/hooks/admin';
import {
  createUserSchema,
  type CreateUserInput,
} from '@/lib/schemas/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Shield, UserCheck, X } from 'lucide-react';

const STATUS_OPTS = [
  { value: '', label: 'Semua Status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Tidak Aktif' },
  { value: 'LOCKED', label: 'Dikunci' },
];

function statusBadge(status: string) {
  const m: Record<string, { variant: string; label: string }> = {
    ACTIVE: { variant: 'default', label: 'Aktif' },
    INACTIVE: { variant: 'secondary', label: 'Tidak Aktif' },
    LOCKED: { variant: 'destructive', label: 'Dikunci' },
  };
  const s = m[status] ?? { variant: 'outline', label: status };
  return <Badge variant={s.variant as any} className="text-[10px]">{s.label}</Badge>;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetPwdId, setResetPwdId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useUsers({
    page,
    limit: 10,
    status: status || undefined,
    search: search || undefined,
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();
  const resetPwdMutation = useResetUserPassword();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', fullName: '', password: '', phone: '' },
  });

  function handleCreate(data: CreateUserInput) {
    createMutation.mutate(data, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
        refetch();
      },
    });
  }

  function handleUpdate(id: string, data: Partial<CreateUserInput>) {
    updateMutation.mutate({ id, data }, {
      onSuccess: () => {
        setEditingId(null);
        form.reset();
        refetch();
      },
    });
  }

  function openEdit(user: any) {
    setEditingId(user.id);
    form.reset({
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? '',
      employeeId: user.employeeId ?? '',
    });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola pengguna dan akses sistem</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Pengguna Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Ubah Pengguna' : 'Pengguna Baru'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((d) => {
                if (editingId) {
                  handleUpdate(editingId, d);
                } else {
                  handleCreate(d);
                }
              })}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="u-email">Email</Label>
                <Input id="u-email" placeholder="user@tenant.co.id" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-name">Nama Lengkap</Label>
                <Input id="u-name" placeholder="Nama lengkap" {...form.register('fullName')} />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-phone">Telepon</Label>
                <Input id="u-phone" placeholder="+62..." {...form.register('phone')} />
              </div>
              {!editingId && (
                <div className="space-y-2">
                  <Label htmlFor="u-pwd">Password</Label>
                  <Input id="u-pwd" type="password" placeholder="Min 6 karakter" {...form.register('password')} />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>
              )}
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari email atau nama…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState title="Belum ada pengguna" description="Buat pengguna pertama untuk tenant ini." />
      )}

      {!isLoading && !error && users.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Peran</th>
                    <th className="px-4 py-3 font-medium">Terakhir Login</th>
                    <th className="px-4 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-xs font-medium">{u.email}</td>
                      <td className="px-4 py-3 text-xs">{u.fullName || '—'}</td>
                      <td className="px-4 py-3">{statusBadge(u.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(u.userRoles ?? []).map((ur: any) => (
                            <Badge key={ur.roleId} variant="secondary" className="text-[10px]">
                              {ur.role?.name ?? ur.roleId}
                            </Badge>
                          ))}
                          {!(u.userRoles?.length) && (
                            <span className="text-xs text-muted-foreground">Tidak ada</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(u)}
                            aria-label="Ubah pengguna"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                          {u.status === 'ACTIVE' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm('Nonaktifkan pengguna ini?'))
                                  deactivateMutation.mutate(u.id, { onSuccess: () => refetch() });
                              }}
                              aria-label="Nonaktifkan"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 text-muted-foreground hover:text-green-600"
                              onClick={() =>
                                activateMutation.mutate(u.id, { onSuccess: () => refetch() })
                              }
                              aria-label="Aktifkan"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => setResetPwdId(u.id)}
                            aria-label="Reset password"
                          >
                            🔑
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <Pagination
          page={page}
          pageSize={10}
          total={total}
          onPageChange={setPage}
        />
      )}

      {resetPwdId && (
        <ResetPasswordDialog
          userId={resetPwdId}
          onClose={() => setResetPwdId(null)}
          onSuccess={() => { setResetPwdId(null); refetch(); }}
        />
      )}
    </div>
  );
}

function ResetPasswordDialog({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pwd, setPwd] = useState('');
  const mutation = useResetUserPassword();

  function submit() {
    if (!pwd || pwd.length < 6) return;
    mutation.mutate(
      { id: userId, password: pwd },
      { onSuccess: () => onSuccess() },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rp-pwd">Password Baru</Label>
            <Input
              id="rp-pwd"
              type="password"
              placeholder="Minimal 6 karakter"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={mutation.isPending || pwd.length < 6} className="flex-1">
              {mutation.isPending ? 'Reset…' : 'Reset'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}