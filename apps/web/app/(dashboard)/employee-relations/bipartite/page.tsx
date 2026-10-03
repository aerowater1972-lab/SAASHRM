'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useBipartiteSessions, useScheduleBipartite, useHoldBipartite, useCloseBipartite,
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

const statusBadge = (s: string) => {
  const m: Record<string, string> = { SCHEDULED: 'secondary', HELD: 'default', FOLLOW_UP: 'secondary', CLOSED: 'success' };
  return <Badge variant={(m[s] || 'secondary') as any}>{s}</Badge>;
};

function parseList(v: string): string[] {
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function BipartitePage() {
  const pathname = usePathname();
  const { data: sessions = [], isLoading, error, refetch } = useBipartiteSessions();
  const scheduleMutation = useScheduleBipartite();
  const holdMutation = useHoldBipartite();
  const closeMutation = useCloseBipartite();
  const canManage = hasPermission('employee-relations:bipartite:manage');
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [err, setErr] = useState('');
  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('');
  const [mgmt, setMgmt] = useState('');
  const [worker, setWorker] = useState('');
  const [minutes, setMinutes] = useState<Record<string, string>>({});
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

  async function handleSchedule() {
    if (!date || !topic || !parseList(mgmt).length || !parseList(worker).length) {
      setErr('Tanggal, topik, dan kedua unsur peserta wajib diisi'); return;
    }
    setErr('');
    try {
      await scheduleMutation.mutateAsync({
        sessionDate: date, topic,
        managementAttendees: parseList(mgmt), workerAttendees: parseList(worker),
      });
      setDialogOpen(false); setDate(''); setTopic(''); setMgmt(''); setWorker(''); refetch();
      toast('Pertemuan dijadwalkan', 'success');
    } catch (e: any) { setErr(e.message); toast(e.message, 'error'); }
  }

  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorState message="Gagal memuat pertemuan" onRetry={() => refetch()} />;

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
          <h1 className="text-2xl font-bold tracking-tight">LKS Bipartit</h1>
          <p className="text-sm text-muted-foreground">Forum pengusaha × pekerja/serikat (UU 13/2003 Ps.106)</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Jadwalkan</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pertemuan baru</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Tanggal</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>Topik</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
                <div><Label>Perwakilan pengusaha (pisahkan koma)</Label><Input value={mgmt} onChange={(e) => setMgmt(e.target.value)} /></div>
                <div><Label>Perwakilan pekerja/serikat (pisahkan koma)</Label><Input value={worker} onChange={(e) => setWorker(e.target.value)} /></div>
                {err && <p className="text-sm text-red-600">{err}</p>}
                <Button onClick={handleSchedule}>Simpan</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(sessions as any[]).length === 0 ? (
        <EmptyState title="Belum ada pertemuan" description="Jadwalkan pertemuan LKS Bipartit pertama." />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Topik</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {(sessions as any[]).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{String(s.sessionDate).slice(0, 10)}</TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="font-medium">{s.topic}</div>
                    {s.minutes && <div className="text-xs text-muted-foreground">Notulen: {s.minutes}</div>}
                  </TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell>
                    {canManage && s.status === 'SCHEDULED' && (
                      <div className="flex gap-1 items-center min-w-[300px]">
                        <Input
                          placeholder="notulen..."
                          className="w-48 h-8 text-xs"
                          value={minutes[s.id] ?? ''}
                          onChange={(e) => setMinutes({ ...minutes, [s.id]: e.target.value })}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== ''}
                          onClick={() => {
                            if (!(minutes[s.id] ?? '').trim()) { toast('Isi notulen dulu', 'error'); return; }
                            void run(s.id, 'hold',
                              () => holdMutation.mutateAsync({ id: s.id, data: { minutes: (minutes[s.id] ?? '').trim(), followUps: [] } }),
                              'Pertemuan dilaksanakan');
                          }}
                        >{busy === `${s.id}:hold` ? '…' : 'Laksanakan'}</Button>
                      </div>
                    )}
                    {canManage && (s.status === 'HELD' || s.status === 'FOLLOW_UP') && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== ''}
                        onClick={() => {
                          void run(s.id, 'close',
                            () => closeMutation.mutateAsync({ id: s.id, data: {} }),
                            'Pertemuan ditutup');
                        }}
                      >{busy === `${s.id}:close` ? '…' : 'Tutup'}</Button>
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
