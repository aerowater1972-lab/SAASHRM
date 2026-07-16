'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRoles, useCreateRole, useDeleteRole } from '@/lib/hooks/admin';
import { createRoleSchema, type CreateRoleInput } from '@/lib/schemas/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Shield, Trash2 } from 'lucide-react';

export default function RolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: roles = [], isLoading, error, refetch } = useRoles();
  const createMutation = useCreateRole();
  const deleteMutation = useDeleteRole();

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
          <h1 className="text-2xl font-bold tracking-tight">Role & Permission</h1>
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
          {roles.map((role: any) => (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{role.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm('Hapus role ini?')) deleteMutation.mutate(role.id, { onSuccess: () => refetch() });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.length > 0 ? (
                    role.permissions.slice(0, 8).map((p: any) => (
                      <Badge key={p.id || `${p.module}:${p.action}`} variant="secondary" className="text-[10px]">
                        {p.module}:{p.action}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada permission</p>
                  )}
                  {role.permissions?.length > 8 && (
                    <Badge variant="outline" className="text-[10px]">+{role.permissions.length - 8}</Badge>
                  )}
                </div>
                {role.isSystem && (
                  <p className="text-xs text-muted-foreground mt-2 italic">System role</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
