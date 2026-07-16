'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTaxConfigs, useCreateTaxConfig, useUpdateTaxConfig } from '@/lib/hooks/payroll';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taxSchema, type TaxInput } from '@/lib/schemas/payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface TaxConfig { id: string; name: string; rate: number; minIncome?: number; maxIncome?: number; isActive: boolean }

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

const defaultValues: TaxInput = { name: '', rate: 0, minIncome: 0, maxIncome: 0, isActive: true };

export default function TaxConfigPage() {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createMutate = useCreateTaxConfig();
  const updateMutate = useUpdateTaxConfig();

  const { data: configs = [], isLoading, error: queryError, refetch } = useTaxConfigs();

  const form = useForm<TaxInput>({ resolver: zodResolver(taxSchema), defaultValues });

  async function onSubmit(data: TaxInput) {
    if (editId) {
      updateMutate.mutate({ id: editId, data }, {
        onSuccess: () => { setDialogOpen(false); setEditId(null); form.reset(); refetch(); },
        onError: (e: any) => setError(e?.message || 'Gagal menyimpan'),
      });
    } else {
      createMutate.mutate(data, {
        onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
        onError: (e: any) => setError(e?.message || 'Gagal menyimpan'),
      });
    }
  }

  function handleEdit(c: TaxConfig) {
    setEditId(c.id);
    form.reset({ name: c.name, rate: Number(c.rate), minIncome: Number(c.minIncome || 0), maxIncome: Number(c.maxIncome || 0), isActive: c.isActive });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2 overflow-x-auto">
        {subPages.map((p) => {
          const isActive = p.exact ? pathname === p.href : pathname.startsWith(p.href);
          return (
            <Link key={p.href} href={p.href}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${isActive ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'}`}
            >{p.label}</Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tax Configurations</h2>
          <p className="text-sm text-muted-foreground">Konfigurasi tarif pajak PPh 21</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit Tax Config' : 'Tambah Tax Config'}</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tx-name">Name</Label>
                <Input id="tx-name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-rate">Rate (%)</Label>
                <Input id="tx-rate" type="number" step="0.01" {...form.register('rate', { valueAsNumber: true })} />
                {form.formState.errors.rate && <p className="text-xs text-destructive">{form.formState.errors.rate.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="tx-min">Min Income</Label>
                  <Input id="tx-min" type="number" {...form.register('minIncome', { valueAsNumber: true })} />
                  {form.formState.errors.minIncome && <p className="text-xs text-destructive">{form.formState.errors.minIncome.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx-max">Max Income</Label>
                  <Input id="tx-max" type="number" {...form.register('maxIncome', { valueAsNumber: true })} />
                  {form.formState.errors.maxIncome && <p className="text-xs text-destructive">{form.formState.errors.maxIncome.message}</p>}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('isActive')} className="rounded border-input h-4 w-4" />
                Active
              </label>
              <Button type="submit" disabled={createMutate.isPending || updateMutate.isPending}>{editId ? 'Perbarui' : 'Simpan'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {isLoading && <TableSkeleton rows={5} columns={5} />}

      {queryError && <ErrorState message={(queryError as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />}

      {!isLoading && configs.length === 0 && (
        <EmptyState title="Belum ada konfigurasi pajak" description="Tambah konfigurasi pajak untuk memulai." />
      )}

      {!isLoading && configs.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Min Income</TableHead>
                <TableHead>Max Income</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{Number(c.rate)}%</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{c.minIncome ? `Rp ${Number(c.minIncome).toLocaleString('id-ID')}` : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.maxIncome ? `Rp ${Number(c.maxIncome).toLocaleString('id-ID')}` : '—'}</TableCell>
                  <TableCell><Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Ya' : 'Tidak'}</Badge></TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleEdit(c)}>Ubah</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
