'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePayrollComponents, useCreatePayrollComponent, useUpdatePayrollComponent, useDeletePayrollComponent } from '@/lib/hooks/payroll';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { payrollComponentSchema, type PayrollComponentInput } from '@/lib/schemas/payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Component { id: string; name: string; type: string; calculationMethod: string; value: number; isActive: boolean; description?: string }

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/components', label: 'Components' },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

const defaultValues: PayrollComponentInput = {
  name: '', type: 'EARNING', calculationMethod: 'FIXED', value: 0, isActive: true, description: '',
};

export default function PayrollComponentsPage() {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createMutate = useCreatePayrollComponent();
  const updateMutate = useUpdatePayrollComponent();
  const deleteMutate = useDeletePayrollComponent();

  const { data: comps = [], isLoading, error: queryError, refetch } = usePayrollComponents();

  const form = useForm<PayrollComponentInput>({ resolver: zodResolver(payrollComponentSchema), defaultValues });

  async function onSubmit(data: PayrollComponentInput) {
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

  function handleEdit(c: Component) {
    setEditId(c.id);
    form.reset({ name: c.name, type: c.type as PayrollComponentInput['type'], calculationMethod: c.calculationMethod as PayrollComponentInput['calculationMethod'], value: Number(c.value), isActive: c.isActive, description: c.description || '' });
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus component ini?')) return;
    try { await deleteMutate.mutateAsync(id); refetch(); }
    catch (e: any) { setError(e.message); }
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
          <h2 className="text-xl font-semibold">Payroll Components</h2>
          <p className="text-sm text-muted-foreground">Master komponen payroll (earning & deduction)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit Component' : 'Tambah Component'}</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pc-name">Name</Label>
                <Input id="pc-name" {...form.register('name')} placeholder="Basic Salary" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="EARNING">EARNING</SelectItem><SelectItem value="DEDUCTION">DEDUCTION</SelectItem></SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Controller
                    control={form.control}
                    name="calculationMethod"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="FIXED">FIXED</SelectItem><SelectItem value="PERCENTAGE">PERCENTAGE</SelectItem></SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.calculationMethod && <p className="text-xs text-destructive">{form.formState.errors.calculationMethod.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-value">Value</Label>
                <Input id="pc-value" type="number" step="0.01" {...form.register('value', { valueAsNumber: true })} />
                {form.formState.errors.value && <p className="text-xs text-destructive">{form.formState.errors.value.message}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('isActive')} className="rounded border-input h-4 w-4" />
                Active
              </label>
              <div className="space-y-2">
                <Label htmlFor="pc-desc">Description</Label>
                <textarea aria-label="Description" id="pc-desc" {...form.register('description')} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <Button type="submit" disabled={createMutate.isPending || updateMutate.isPending}>{editId ? 'Perbarui' : 'Simpan'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {isLoading && <TableSkeleton rows={5} columns={6} />}

      {queryError && <ErrorState message={(queryError as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />}

      {!isLoading && comps.length === 0 && (
        <EmptyState title="Belum ada komponen payroll" description="Tambah komponen payroll untuk memulai." />
      )}

      {!isLoading && comps.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comps.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant={c.type === 'EARNING' ? 'success' : 'destructive'}>{c.type}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{c.calculationMethod}</Badge></TableCell>
                  <TableCell className="font-mono">{c.calculationMethod === 'PERCENTAGE' ? `${Number(c.value)}%` : `Rp ${Number(c.value).toLocaleString('id-ID')}`}</TableCell>
                  <TableCell><Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Yes' : 'No'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(c)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
