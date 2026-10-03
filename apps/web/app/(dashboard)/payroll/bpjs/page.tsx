'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBpjsConfigs, useCreateBpjsConfig, useUpdateBpjsConfig, useMonthlyIuran } from '@/lib/hooks/payroll';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bpjsSchema, type BpjsInput } from '@/lib/schemas/payroll';
import { EmployeeSearch } from '@/components/employee-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Calculator } from 'lucide-react';

interface BpjsConfig { id: string; name: string; type: string; employeeRate: number; employerRate: number; maxWage?: number; isActive: boolean }

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

const types = ['KES', 'TENAGA_KERJA', 'PENSIUN'];

const defaultValues: BpjsInput = { name: '', type: 'KES', employeeRate: 0, employerRate: 0, maxWage: 0, isActive: true };

export default function BpjsConfigPage() {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createMutate = useCreateBpjsConfig();
  const updateMutate = useUpdateBpjsConfig();

  const { data: configs = [], isLoading, error: queryError, refetch } = useBpjsConfigs();

  const form = useForm<BpjsInput>({ resolver: zodResolver(bpjsSchema), defaultValues });

  async function onSubmit(data: BpjsInput) {
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

  function handleEdit(c: BpjsConfig) {
    setEditId(c.id);
    form.reset({ name: c.name, type: c.type as BpjsInput['type'], employeeRate: Number(c.employeeRate), employerRate: Number(c.employerRate), maxWage: Number(c.maxWage || 0), isActive: c.isActive });
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
          <h2 className="text-xl font-semibold">BPJS Configurations</h2>
          <p className="text-sm text-muted-foreground">Konfigurasi BPJS Kesehatan dan Ketenagakerjaan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit BPJS Config' : 'Tambah BPJS Config'}</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bp-name">Name</Label>
                <Input id="bp-name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bp-emp">Employee Rate (%)</Label>
                  <Input id="bp-emp" type="number" step="0.01" {...form.register('employeeRate', { valueAsNumber: true })} />
                  {form.formState.errors.employeeRate && <p className="text-xs text-destructive">{form.formState.errors.employeeRate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-empl">Employer Rate (%)</Label>
                  <Input id="bp-empl" type="number" step="0.01" {...form.register('employerRate', { valueAsNumber: true })} />
                  {form.formState.errors.employerRate && <p className="text-xs text-destructive">{form.formState.errors.employerRate.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-max">Max Wage</Label>
                <Input id="bp-max" type="number" {...form.register('maxWage')} />
                {form.formState.errors.maxWage && <p className="text-xs text-destructive">{form.formState.errors.maxWage.message}</p>}
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

      <IuranPreviewCard />

      {isLoading && <TableSkeleton rows={5} columns={6} />}

      {queryError && <ErrorState message={(queryError as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />}

      {!isLoading && configs.length === 0 && (
        <EmptyState title="Belum ada konfigurasi BPJS" description="Tambah konfigurasi BPJS untuk memulai." />
      )}

      {!isLoading && configs.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Emp. Rate</TableHead>
                <TableHead>Empl. Rate</TableHead>
                <TableHead>Max Wage</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell>{Number(c.employeeRate)}%</TableCell>
                  <TableCell>{Number(c.employerRate)}%</TableCell>
                  <TableCell className="text-muted-foreground">{c.maxWage ? `Rp ${Number(c.maxWage).toLocaleString('id-ID')}` : '—'}</TableCell>
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

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function IuranPreviewCard() {
  const now = new Date();
  const [empId, setEmpId] = useState('');
  const [empLabel, setEmpLabel] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading, error } = useMonthlyIuran({ employeeId: empId, month, year });
  const r = data as any;

  const rp = (n: unknown) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Pratinjau Iuran Bulanan (Kesehatan + JKK)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <EmployeeSearch value={empId} onChange={(id, label) => { setEmpId(id); setEmpLabel(label); }} />
          </div>
          <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {!empId && <p className="text-sm text-muted-foreground">Pilih karyawan untuk melihat pratinjau iuran.</p>}
        {empId && isLoading && <p className="text-sm text-muted-foreground">Menghitung…</p>}
        {empId && error && <p className="text-sm text-destructive">Gagal menghitung pratinjau.</p>}
        {empId && r && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Kesehatan — Perusahaan</p>
              <p className="text-lg font-bold">{rp(r.kesehatan?.employer)}</p>
              <p className="text-xs text-muted-foreground mt-1">Basis upah: {rp(r.kesehatan?.wageBase)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Kesehatan — Karyawan + JKK</p>
              <p className="text-lg font-bold">{rp((r.kesehatan?.employee || 0) + (r.jkk?.total || 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Kes {rp(r.kesehatan?.employee)} · JKK {rp(r.jkk?.total)}
              </p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Total gabungan</p>
              <p className="text-lg font-bold">{rp(r.totalCombined)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {r.employeeName ?? empLabel} · Gaji pokok {rp(r.baseSalary)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
