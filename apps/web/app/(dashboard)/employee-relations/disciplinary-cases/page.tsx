'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useDisciplinaryCases, useCreateDisciplinaryCase, useApproveDisciplinaryCase, useAcknowledgeDisciplinaryCase } from '@/lib/hooks/employee-relations';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { escalateUnacknowledgedCases } from '@/lib/api/employee-relations';
import { useViolationCategories } from '@/lib/hooks/employee-relations';
import { EmployeeSearch } from '@/components/employee-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { hasPermission } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Plus, AlertCircle, ArrowUpCircle } from 'lucide-react';

const tabs = [
  { href: '/employee-relations', label: 'Dashboard' },
  { href: '/employee-relations/disciplinary-cases', label: 'Surat Peringatan' },
  { href: '/employee-relations/grievances', label: 'Pengaduan' },
  { href: '/employee-relations/bipartite', label: 'LKS Bipartit' },
  { href: '/employee-relations/incident-reports', label: 'Insiden Kerja' },
  { href: '/employee-relations/ppe-assignments', label: 'APD' },
  { href: '/employee-relations/violation-categories', label: 'Kategori Pelanggaran' },
];

const spBadge = (sp: string) => {
  const m: Record<string, string> = { SP3: 'destructive', SP2: 'secondary', SP1: 'success' };
  return <Badge variant={(m[sp] || 'secondary') as any}>{sp}</Badge>;
};
const statusBadge = (s: string) => {
  const m: Record<string, string> = { DRAFT: 'secondary', APPROVED: 'success', ACKNOWLEDGED: 'default', EXPIRED: 'destructive', CANCELLED: 'outline' };
  return <Badge variant={(m[s] || 'secondary') as any}>{s}</Badge>;
};

export default function DisciplinaryCasesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: cases = [], isLoading, error, refetch } = useDisciplinaryCases();
  const { data: categories = [] } = useViolationCategories();
  const createMutation = useCreateDisciplinaryCase();
  const approveMutation = useApproveDisciplinaryCase();
  const ackMutation = useAcknowledgeDisciplinaryCase();
  const canApprove = hasPermission('disciplinary-cases:approve');
  const canAck = hasPermission('disciplinary-cases:acknowledge');

  const qc = useQueryClient();
  const escalateMutation = useMutation({
    mutationFn: escalateUnacknowledgedCases,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disciplinary-cases'] }); toast('Eskalasi SP berhasil', 'success'); },
    onError: () => toast('Gagal melakukan eskalasi SP', 'error'),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [err, setErr] = useState('');
  const [empId, setEmpId] = useState('');
  const [catId, setCatId] = useState('');
  const [desc, setDesc] = useState('');

  async function handleCreate() {
    if (!empId || !catId || !desc) { setErr('Semua field wajib'); return; }
    setErr('');
    try {
      await createMutation.mutateAsync({ employeeId: empId, violationCategoryId: catId, description: desc });
      setDialogOpen(false); setEmpId(''); setCatId(''); setDesc(''); refetch();
      toast('SP berhasil dibuat', 'success');
    } catch (e: any) { setErr(e.message); toast(e.message, 'error'); }
  }

  async function handleApprove(id: string) {
    try { await approveMutation.mutateAsync({ id, approvedById: 'nsm-user-hr' }); refetch(); toast('SP disetujui', 'success'); } catch (e: any) { setErr(e.message); toast(e.message, 'error'); }
  }
  async function handleAcknowledge(id: string) {
    try { await ackMutation.mutateAsync(id); refetch(); toast('SP diakui', 'success'); } catch (e: any) { setErr(e.message); toast(e.message, 'error'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2 flex-wrap">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${
              pathname === tab.href ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >{tab.label}</Link>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-semibold">Surat Peringatan (SP)</h2><p className="text-sm text-muted-foreground">Eskalasi berjenjang SP1 → SP2 → SP3</p></div>
        <div className="flex gap-2">
          {canApprove && (
            <Button variant="outline" size="sm" onClick={() => escalateMutation.mutate()}>
              <ArrowUpCircle className="mr-2 h-4 w-4" />Eskalasi SP
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEmpId(''); setCatId(''); setDesc(''); } }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Buat SP Baru</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat Surat Peringatan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <EmployeeSearch value={empId} onChange={(id) => setEmpId(id)} label="Karyawan" />
              <div className="space-y-2">
                <Label>Kategori Pelanggaran</Label>
                <select value={catId} onChange={e => setCatId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Pilih kategori</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <Button onClick={handleCreate}>Ajukan SP</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {(err || error) && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{err || (error as any)?.message}</div>}
      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && cases.length === 0 && <EmptyState title="Belum ada SP" description="Laporkan pelanggaran untuk menerbitkan SP pertama." />}
      {!isLoading && !error && cases.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Level SP</TableHead>
                <TableHead>Pelanggaran</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <button className="text-left hover:underline text-sm" onClick={() => router.push(`/employee-relations/disciplinary-cases/${c.employeeId}`)}>
                      {c.employee?.fullName || c.employeeId}
                    </button>
                  </TableCell>
                  <TableCell>{spBadge(c.spLevel)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.violationCategory?.name || c.violationCategoryId}</TableCell>
                  <TableCell className="text-xs">{new Date(c.issuedDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {statusBadge(c.status)}
                      {c.escalatedAt && <span className="relative group"><ArrowUpCircle className="h-3.5 w-3.5 text-orange-500" /><span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Dieskalasi ke {c.escalatedTo?.fullName ?? 'HR'}</span></span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {c.status === 'DRAFT' && canApprove && <Button variant="outline" size="sm" onClick={() => handleApprove(c.id)}>Setujui</Button>}
                      {c.status === 'APPROVED' && canAck && <Button variant="outline" size="sm" onClick={() => handleAcknowledge(c.id)}>Acknowledge</Button>}
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
