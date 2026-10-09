'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBpjsClaims, useCreateBpjsClaim, useUpdateBpjsClaim, useBpjsClaimStats } from '@/lib/hooks/payroll';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bpjsClaimSchema, type BpjsClaimInput } from '@/lib/schemas/payroll';
import type { BpjsClaimStatus } from '@/lib/api/payroll';
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
import { Plus, FileText, CheckCircle2, XCircle, Truck, Hourglass } from 'lucide-react';

const subPages = [
  { href: '/payroll', label: 'Payroll Periods', exact: true },
  { href: '/payroll/tax', label: 'Tax Config' },
  { href: '/payroll/bpjs', label: 'BPJS Config', exact: true },
  { href: '/payroll/bpjs/claims', label: 'Klaim BPJS' },
  { href: '/payroll/salary-components', label: 'Salary Components' },
  { href: '/payroll/bank-transfers', label: 'Bank Transfers' },
];

const claimTypes = ['RAWAT_INAP', 'RAWAT_JALAN', 'KUNING', 'MERAH', 'KELAHIRAN', 'LAINNYA'];
const statuses: BpjsClaimStatus[] = ['SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'PAID'];

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  SUBMITTED: 'warning',
  PROCESSING: 'info',
  APPROVED: 'success',
  REJECTED: 'destructive',
  PAID: 'default',
};

const statusLabel: Record<string, string> = {
  SUBMITTED: 'Diajukan',
  PROCESSING: 'Diproses',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  PAID: 'Dibayar',
};

function formatRp(n: number | string | undefined | null) {
  const v = Number(n ?? 0);
  return 'Rp' + v.toLocaleString('id-ID');
}

function formatDate(s?: string) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const defaultValues: Partial<BpjsClaimInput> = {
  claimType: 'RAWAT_JALAN',
};

export default function BpjsClaimsPage() {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionClaim, setActionClaim] = useState<{ id: string; action: BpjsClaimStatus } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');

  const params = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter as BpjsClaimStatus } : {}),
    ...(typeFilter !== 'ALL' ? { claimType: typeFilter as BpjsClaimInput['claimType'] } : {}),
    ...(employeeId ? { employeeId } : {}),
  };
  const { data, isLoading, error: queryError, refetch } = useBpjsClaims(params);
  const { data: stats } = useBpjsClaimStats();
  const createMutate = useCreateBpjsClaim();
  const updateMutate = useUpdateBpjsClaim();

  const form = useForm<BpjsClaimInput>({ resolver: zodResolver(bpjsClaimSchema), defaultValues: defaultValues as BpjsClaimInput });
  const actionForm = useForm<{ approvedAmount?: number; patientShare?: number; notes?: string }>({ defaultValues: {} });

  async function onSubmit(data: BpjsClaimInput) {
    createMutate.mutate(data as unknown as Record<string, unknown>, {
      onSuccess: () => { setDialogOpen(false); form.reset(defaultValues as BpjsClaimInput); setError(''); refetch(); },
      onError: (e: any) => setError(e?.message || 'Gagal menyimpan klaim'),
    });
  }

  async function onAction(data: { approvedAmount?: number; patientShare?: number; notes?: string }) {
    if (!actionClaim) return;
    updateMutate.mutate({ id: actionClaim.id, data: { status: actionClaim.action, ...data } as unknown as Record<string, unknown> }, {
      onSuccess: () => { setActionClaim(null); actionForm.reset({}); refetch(); },
      onError: (e: any) => setError(e?.message || 'Gagal memproses klaim'),
    });
  }

  const claims = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const statCards = [
    { label: 'Total Klaim', value: String((stats as any)?.total ?? claims.length ?? 0), icon: FileText },
    { label: 'Menunggu', value: String((stats as any)?.byStatus?.SUBMITTED ?? (stats as any)?.pending ?? claims.filter((c: any) => c.status === 'SUBMITTED').length), icon: Hourglass },
    { label: 'Disetujui', value: String((stats as any)?.byStatus?.APPROVED ?? claims.filter((c: any) => c.status === 'APPROVED').length), icon: CheckCircle2 },
    { label: 'Dibayar', value: String((stats as any)?.byStatus?.PAID ?? claims.filter((c: any) => c.status === 'PAID').length), icon: Truck },
    { label: 'Ditolak', value: String((stats as any)?.byStatus?.REJECTED ?? claims.filter((c: any) => c.status === 'REJECTED').length), icon: XCircle },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2 overflow-x-auto">
        {subPages.map((p) => {
          const isActive = (p as any).exact ? pathname === p.href : pathname.startsWith(p.href);
          return (
            <Link key={p.href} href={p.href}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${isActive ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'}`}
            >{p.label}</Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Klaim BPJS</h2>
          <p className="text-sm text-muted-foreground">Alur: Diajukan → Diproses → Disetujui → Dibayar (atau Ditolak)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) form.reset(defaultValues as BpjsClaimInput); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Ajukan Klaim</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Pengajuan Klaim BPJS</DialogTitle></DialogHeader>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                control={form.control}
                name="employeeId"
                render={({ field }) => <EmployeeSearch value={field.value ?? ''} onChange={(id) => field.onChange(id)} />}
              />
              {form.formState.errors.employeeId && <p className="text-xs text-destructive">{form.formState.errors.employeeId.message}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Jenis Klaim</Label>
                  <Controller
                    control={form.control}
                    name="claimType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{claimTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-num">Nomor Klaim</Label>
                  <Input id="cl-num" {...form.register('claimNumber')} placeholder="CLM-2026-0001" />
                  {form.formState.errors.claimNumber && <p className="text-xs text-destructive">{form.formState.errors.claimNumber.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cl-dx">Kode Diagnosa</Label>
                  <Input id="cl-dx" {...form.register('diagnosisCode')} placeholder="J06.9" />
                  {form.formState.errors.diagnosisCode && <p className="text-xs text-destructive">{form.formState.errors.diagnosisCode.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-dxn">Nama Diagnosa</Label>
                  <Input id="cl-dxn" {...form.register('diagnosisName')} placeholder="ISPA" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cl-adm">Tanggal Masuk</Label>
                  <Input id="cl-adm" type="date" {...form.register('admissionDate')} />
                  {form.formState.errors.admissionDate && <p className="text-xs text-destructive">{form.formState.errors.admissionDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-dis">Tanggal Keluar</Label>
                  <Input id="cl-dis" type="date" {...form.register('dischargeDate')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cl-hosp">RS / Faskes</Label>
                  <Input id="cl-hosp" {...form.register('hospitalName')} placeholder="RS Contoh" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-amt">Nominal Klaim (Rp)</Label>
                  <Input id="cl-amt" type="number" min={0} {...form.register('claimAmount', { valueAsNumber: true })} />
                  {form.formState.errors.claimAmount && <p className="text-xs text-destructive">{form.formState.errors.claimAmount.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-notes">Catatan</Label>
                <Input id="cl-notes" {...form.register('notes')} placeholder="Opsional" />
              </div>
              <Button type="submit" disabled={createMutate.isPending} className="w-full">
                {createMutate.isPending ? 'Menyimpan…' : 'Ajukan Klaim'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Jenis</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                {claimTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[260px]">
            <EmployeeSearch value={employeeId} onChange={(id) => setEmployeeId(id)} label="Karyawan" />
          </div>
          {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || employeeId) && (
            <Button variant="outline" size="sm" onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setEmployeeId(''); }}>
              Reset
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-4"><TableSkeleton rows={6} columns={6} /></div>}
          {queryError && <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>}
          {!isLoading && !queryError && claims.length === 0 && (
            <div className="p-4"><EmptyState title="Belum ada klaim" description="Ajukan klaim BPJS pertama melalui tombol di atas." /></div>
          )}
          {!isLoading && !queryError && claims.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Klaim</TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Tgl Masuk</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-right">Disetujui</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.claimNumber}</TableCell>
                      <TableCell>{c.employee?.fullName ?? c.employeeId}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{c.claimType}</Badge></TableCell>
                      <TableCell>{formatDate(c.admissionDate)}</TableCell>
                      <TableCell className="text-right">{formatRp(c.claimAmount)}</TableCell>
                      <TableCell className="text-right">{c.approvedAmount != null ? formatRp(c.approvedAmount) : '-'}</TableCell>
                      <TableCell><Badge variant={statusVariant[c.status] ?? 'secondary'} className="text-[10px]">{statusLabel[c.status] ?? c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.status === 'SUBMITTED' && (
                            <Button variant="outline" size="sm" onClick={() => setActionClaim({ id: c.id, action: 'PROCESSING' })}>Proses</Button>
                          )}
                          {(c.status === 'SUBMITTED' || c.status === 'PROCESSING') && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => { setActionClaim({ id: c.id, action: 'APPROVED' }); actionForm.reset({ approvedAmount: Number(c.claimAmount ?? 0) }); }}>Setujui</Button>
                              <Button variant="outline" size="sm" onClick={() => setActionClaim({ id: c.id, action: 'REJECTED' })}>Tolak</Button>
                            </>
                          )}
                          {c.status === 'APPROVED' && (
                            <Button variant="outline" size="sm" onClick={() => setActionClaim({ id: c.id, action: 'PAID' })}>Bayar</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!actionClaim} onOpenChange={(o) => { if (!o) { setActionClaim(null); actionForm.reset({}); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionClaim?.action === 'APPROVED' ? 'Setujui Klaim' : actionClaim?.action === 'REJECTED' ? 'Tolak Klaim' : actionClaim?.action === 'PAID' ? 'Tandai Dibayar' : 'Proses Klaim'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={actionForm.handleSubmit(onAction)} className="space-y-4">
            {(actionClaim?.action === 'APPROVED' || actionClaim?.action === 'PAID') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ac-amt">Nominal Disetujui (Rp)</Label>
                  <Input id="ac-amt" type="number" min={0} {...actionForm.register('approvedAmount', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ac-share">Porsi Pasien (Rp)</Label>
                  <Input id="ac-share" type="number" min={0} {...actionForm.register('patientShare', { valueAsNumber: true })} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="ac-notes">Catatan</Label>
              <Input id="ac-notes" {...actionForm.register('notes')} placeholder={actionClaim?.action === 'REJECTED' ? 'Alasan penolakan' : 'Opsional'} />
            </div>
            <Button type="submit" disabled={updateMutate.isPending} className="w-full">
              {updateMutate.isPending ? 'Memproses…' : 'Konfirmasi'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
