'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePpeAssignments, useCreatePpeAssignment, useExpirePpeAssignment } from '@/lib/hooks/employee-relations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/lib/toast';
import { Plus, Download } from 'lucide-react';
import { EmployeeSearch } from '@/components/employee-search';
import { exportCsv } from '@/lib/utils/export-csv';

const tabs = [
  { href: '/employee-relations', label: 'Dashboard' },
  { href: '/employee-relations/disciplinary-cases', label: 'Surat Peringatan' },
  { href: '/employee-relations/grievances', label: 'Pengaduan' },
  { href: '/employee-relations/bipartite', label: 'LKS Bipartit' },
  { href: '/employee-relations/incident-reports', label: 'Insiden Kerja' },
  { href: '/employee-relations/ppe-assignments', label: 'APD' },
  { href: '/employee-relations/violation-categories', label: 'Kategori Pelanggaran' },
];

const statusBadge = (s: string) => {
  const m: Record<string, string> = { ACTIVE: 'success', EXPIRED: 'destructive', REPLACED: 'secondary' };
  return <Badge variant={(m[s] || 'secondary') as any}>{s}</Badge>;
};

export default function PpeAssignmentsPage() {
  const pathname = usePathname();
  const { data: items = [], isLoading, error, refetch } = usePpeAssignments();
  const createMutation = useCreatePpeAssignment();
  const expireMutation = useExpirePpeAssignment();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ employeeId: '', ppeType: '', assignedDate: '', expiryDate: '', condition: 'NEW', notes: '' });

  async function handleCreate() {
    if (!f.employeeId || !f.ppeType) { setErr('Nama karyawan dan tipe APD wajib'); return; }
    setErr('');
    try {
      await createMutation.mutateAsync(f);
      setDialogOpen(false); setF({ employeeId: '', ppeType: '', assignedDate: '', expiryDate: '', condition: 'NEW', notes: '' }); refetch();
      toast('APD berhasil di-assign', 'success');
    } catch (e: any) { setErr(e.message); toast(e.message, 'error'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2 flex-wrap">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${ pathname === tab.href ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground' }`}
          >{tab.label}</Link>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-semibold">Alat Pelindung Diri (APD)</h2><p className="text-sm text-muted-foreground">Tracking assignment & kedaluwarsa APD</p></div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setErr(''); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Assign APD</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign APD ke Karyawan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <EmployeeSearch value={f.employeeId} onChange={(id) => setF(f2 => ({ ...f2, employeeId: id }))} label="Karyawan" />
              <div className="space-y-2">
                <Label>Tipe APD</Label>
                <Input value={f.ppeType} onChange={e => setF(f2 => ({ ...f2, ppeType: e.target.value }))} placeholder="Safety Helmet / Masker / Sarung Tangan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tanggal Assign</Label>
                  <Input type="date" value={f.assignedDate} onChange={e => setF(f2 => ({ ...f2, assignedDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Kedaluwarsa</Label>
                  <Input type="date" value={f.expiryDate} onChange={e => setF(f2 => ({ ...f2, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kondisi Awal</Label>
                <select value={f.condition} onChange={e => setF(f2 => ({ ...f2, condition: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="NEW">Baru</option>
                  <option value="GOOD">Baik</option>
                  <option value="FAIR">Cukup</option>
                  <option value="WORN">Aus</option>
                  <option value="DAMAGED">Rusak</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input value={f.notes} onChange={e => setF(f2 => ({ ...f2, notes: e.target.value }))} placeholder="Ukuran, merek, etc." />
              </div>
              <Button onClick={handleCreate}>Assign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {(err || error) && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{err || (error as any)?.message}</div>}
      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && items.length === 0 && <EmptyState title="Belum ada APD ter-assign" description="Assign APD pertama ke karyawan." />}
      {!isLoading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Karyawan</TableHead><TableHead>Tipe APD</TableHead><TableHead>Kondisi</TableHead><TableHead>Tanggal Assign</TableHead><TableHead>Kedaluwarsa</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.employee?.fullName || it.employeeId}</TableCell>
                  <TableCell>{it.ppeType}</TableCell>
                  <TableCell><Badge variant="secondary">{it.condition}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(it.assignedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{statusBadge(it.status)}</TableCell>
                  <TableCell className="text-right">
                    {it.status === 'ACTIVE' && <Button variant="outline" size="sm" onClick={async () => { try { await expireMutation.mutateAsync(it.id); refetch(); toast('APD ditandai kedaluwarsa', 'success'); } catch (e: any) { setErr(e.message); toast(e.message, 'error'); } }}>Tandai Kedaluwarsa</Button>}
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
