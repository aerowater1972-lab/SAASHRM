'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTenants, useCreateTenant } from '@/lib/hooks/admin';
import { createTenantSchema, type CreateTenantInput } from '@/lib/schemas/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2 } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  SUSPENDED: 'destructive',
  TRIAL: 'warning',
  EXPIRED: 'secondary',
};

export default function TenantsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tenants = [], isLoading, error, refetch } = useTenants();
  const createMutation = useCreateTenant();

  const form = useForm<CreateTenantInput>({ resolver: zodResolver(createTenantSchema) });

  async function onSubmit(data: CreateTenantInput) {
    createMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant</h1>
          <p className="text-sm text-muted-foreground">Kelola workspace dan organisasi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tenant Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Tenant Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Nama Tenant</Label>
                <Input id="tenant-name" placeholder="e.g. PT Maju Jaya" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-domain">Domain (opsional)</Label>
                <Input id="tenant-domain" placeholder="majujaya.com" {...form.register('domain')} />
                {form.formState.errors.domain && <p className="text-xs text-destructive">{form.formState.errors.domain.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-package">Paket (opsional)</Label>
                <Controller
                  control={form.control}
                  name="package"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="tenant-package">
                        <SelectValue placeholder="Pilih paket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDARD">STANDARD</SelectItem>
                        <SelectItem value="PROFESSIONAL">PROFESSIONAL</SelectItem>
                        <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.package && <p className="text-xs text-destructive">{form.formState.errors.package.message}</p>}
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

      {!isLoading && !error && tenants.length === 0 && (
        <EmptyState title="Belum ada tenant" description="Buat tenant pertama untuk memulai." />
      )}

      {!isLoading && !error && tenants.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t: any) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domain</span>
                    <span>{t.domain || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <Badge variant="secondary">{t.package}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={(statusVariant[t.status] || 'secondary') as any}>{t.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
