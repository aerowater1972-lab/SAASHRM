'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSalaryComponents, useCreateSalaryComponent } from '@/lib/hooks/payroll';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { salaryComponentSchema, type SalaryComponentInput } from '@/lib/schemas/payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus } from 'lucide-react';

const typeBadge: Record<string, 'success' | 'info' | 'destructive'> = { basic_salary: 'success', allowance: 'info', deduction: 'destructive' };

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

export default function SalaryComponentsPage() {
  const pathname = usePathname();
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutate = useCreateSalaryComponent();

  const { data: res, isLoading, error: queryError, refetch } = useSalaryComponents(selectedEmp ? { employeeId: selectedEmp } : undefined);
  const data = res?.data ?? [];

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get<any[]>('/employees'),
  });

  const form = useForm<SalaryComponentInput>({
    resolver: zodResolver(salaryComponentSchema),
    defaultValues: { employeeId: '', componentType: 'basic_salary', amount: 0, effectiveDate: '' },
  });

  useEffect(() => { if (employeesData) setEmployees(employeesData); }, [employeesData]);

  async function onSubmit(data: SalaryComponentInput) {
    createMutate.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
      onError: (e: any) => setError(e?.message || 'Gagal menyimpan'),
    });
  }

  if (isLoading) return <TableSkeleton rows={5} columns={5} />;
  if (queryError) return <ErrorState message={(queryError as any)?.message || 'Gagal memuat data'} onRetry={() => refetch()} />;
  if (data.length === 0) return <EmptyState title="Belum ada komponen gaji" description="Belum ada data komponen gaji karyawan." />;

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
          <h2 className="text-xl font-semibold">Salary Components</h2>
          <p className="text-sm text-muted-foreground">Komponen gaji per karyawan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) form.reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Component</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Component</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Controller
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.employeeId && <p className="text-xs text-destructive">{form.formState.errors.employeeId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Controller
                  control={form.control}
                  name="componentType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic_salary">Basic Salary</SelectItem>
                        <SelectItem value="allowance">Allowance</SelectItem>
                        <SelectItem value="deduction">Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.componentType && <p className="text-xs text-destructive">{form.formState.errors.componentType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-amount">Amount</Label>
                <Input id="sc-amount" type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} />
                {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-effective">Effective Date</Label>
                <Input id="sc-effective" type="date" {...form.register('effectiveDate')} />
                {form.formState.errors.effectiveDate && <p className="text-xs text-destructive">{form.formState.errors.effectiveDate.message}</p>}
              </div>
              <Button type="submit" disabled={createMutate.isPending}>{createMutate.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex items-center gap-3">
        <Select value={selectedEmp} onValueChange={(v) => setSelectedEmp(v)}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="Semua karyawan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua karyawan</SelectItem>
            {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c: any) => {
                const emp = employees.find((e: any) => e.id === c.employeeId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{emp?.fullName || c.employeeId}</TableCell>
                    <TableCell><Badge variant={(typeBadge[c.componentType] || 'secondary') as any}>{c.componentType.replace('_', ' ').toUpperCase()}</Badge></TableCell>
                    <TableCell className="text-right font-mono">Rp {Number(c.amount).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(c.effectiveDate).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-muted-foreground">{c.endDate ? new Date(c.endDate).toLocaleDateString('id-ID') : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {data.length === 0 && <div className="p-4 text-sm text-muted-foreground">Belum ada komponen gaji.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
