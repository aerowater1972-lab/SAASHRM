'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useGrievances, useReportGrievance, useAssignGrievanceHandler, useAdvanceGrievance,
} from '@/lib/hooks/employee-relations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { hasPermission } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Plus } from 'lucide-react';

const tabs = [
  { href: '/employee-relations', label: 'Dashboard' },
  { href: '/employee-relations/disciplinary-cases', label: 'Surat Peringatan' },
  { href: '/employee-relations/grievances', label: 'Pengaduan' },
  { href: '/employee-relations/bipartite', label: 'LKS Bipartit' },
  { href: '/employee-relations/incident-reports', label: 'Insiden Kerja' },
  { href: '/employee-relations/ppe-assignments', label: 'APD' },
  { href: '/employee-relations/violation-categories', label: 'Kategori Pelanggaran' },
];

const CATEGORIES = ['UPAH', 'JADWAL', 'KEKERASAN', 'DISKRIMINASI', 'K3', 'LAINNYA'];
const NEXT: Record<string, string[]> = {
  REPORTED: ['IN_REVIEW', 'REJECTED'],
  IN_REVIEW: ['MEDIATION', 'RESOLVED', 'REJECTED'],
  MEDIATION: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [], REJECTED: [],
};

const statusBadge = (s: string) => {
  const m: Record<string, string> = {
    REPORTED: 'secondary', IN_REVIEW: 'default', MEDIATION: 'secondary',
    RESOLVED: 'success', CLOSED: 'success', REJECTED: 'destructive',
  };
  return <Badge variant={(m[s] || 'secondary') as any}>{s}</Badge>;
};

export default function GrievancesPage() {
  const pathname = usePathname();
  const { data: cases = [], isLoading, error, refetch } = useGrievances();
  const reportMutation = useReportGrievance();
  const assignMutation = useAssignGrievanceHandler();
  const advanceMutation = useAdvanceGrievance();
  const canManage = hasPermission('employee-relations:grievance:manage');
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [err, setErr] = useState('');
  const [category, setCategory] = useState('UPAH');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [handlerId, setHandlerId] = useState<Record<string, string>>({});
  const [resolution, setResolution] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  async function run(id: string, action: string, fn: () => Promise<unknown>, done: string) {
    setBusy(`${id}:${action}`);
    try {
      await fn();
      refetch();
      toast(done, 'success');
    } catch (e: any) {
      toast(e.message ?? 'Gagal', 'error');
    } finally {
      setBusy('');
    }
  }

  async function handleReport() {
    if (!subject || !description) { setErr('Subjek dan deskripsi wajib'); return; }
    setErr('');
    try {
      // pelapor = karyawan pemilik akun (diambil dari JWT di backend)
      await reportMutation.mutateAsync({ category, subject, description } as any);
      setDialogOpen(false); setSubject(''); setDescription(''); refetch();
      toast('Pengaduan tercatat', 'success');
    } catch (e: any) { setErr(e.message); toast(e.message, 'error'); }
  }

  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorState message="Gagal memuat pengaduan" onRetry={() => refetch()} />;

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaduan Pekerja</h1>
          <p className="text-sm text-muted-foreground">Grievance REPORTED → IN_REVIEW → MEDIATION → RESOLVED → CLOSED</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Lapor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Pengaduan baru</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Kategori</Label>
                <select className="border rounded-md px-2 py-1.5 text-sm bg-background w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label>Subjek</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              <div><Label>Deskripsi</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <Button onClick={handleReport}>Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(cases as any[]).length === 0 ? (
        <EmptyState title="Belum ada pengaduan" description="Pengaduan pekerja akan muncul di sini." />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Subjek</TableHead><TableHead>Kategori</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {(cases as any[]).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="min-w-[220px]">
                    <div className="font-medium">{c.subject}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                    {c.resolution && <div className="text-xs text-emerald-700">Hasil: {c.resolution}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell>
                    {canManage && (
                      <div className="flex gap-1 flex-wrap items-center min-w-[280px]">
                        <Input
                          placeholder="handler user id"
                          className="w-32 h-8 text-xs"
                          value={handlerId[c.id] ?? ''}
                          onChange={(e) => setHandlerId({ ...handlerId, [c.id]: e.target.value })}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== ''}
                          onClick={() => {
                            if (!(handlerId[c.id] ?? '').trim()) { toast('Isi handler user id dulu', 'error'); return; }
                            void run(c.id, 'assign',
                              () => assignMutation.mutateAsync({ id: c.id, handlerUserId: handlerId[c.id].trim() }),
                              'Penangan ditunjuk');
                          }}
                        >{busy === `${c.id}:assign` ? '…' : 'Tunjuk'}</Button>
                        {(NEXT[c.status] ?? []).map((to: string) => (
                          <span key={to} className="inline-flex gap-1 items-center">
                            {['RESOLVED', 'CLOSED'].includes(to) && (
                              <Input
                                placeholder="hasil penyelesaian"
                                className="w-36 h-8 text-xs"
                                value={resolution[c.id] ?? ''}
                                onChange={(e) => setResolution({ ...resolution, [c.id]: e.target.value })}
                              />
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy !== ''}
                              onClick={() => {
                                if (['RESOLVED', 'CLOSED'].includes(to) && !(resolution[c.id] ?? '').trim()) {
                                  toast('Isi hasil penyelesaian dulu', 'error'); return;
                                }
                                void run(c.id, to,
                                  () => advanceMutation.mutateAsync({ id: c.id, data: { to, resolution: (resolution[c.id] ?? '').trim() || undefined } }),
                                  `Status → ${to}`);
                              }}
                            >{busy === `${c.id}:${to}` ? '…' : to}</Button>
                          </span>
                        ))}
                      </div>
                    )}
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
