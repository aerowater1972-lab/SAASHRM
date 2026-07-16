'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOvertimeRequests, useCreateOvertime, useApproveOvertime, useRejectOvertime, useRetroactiveApproveOvertime, useOvertimeRecords } from '@/lib/hooks/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { overtimeSchema, type OvertimeInput } from '@/lib/schemas/attendance';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
};

export default function OvertimePage() {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requests = [], isLoading, error, refetch } = useOvertimeRequests();
  const { data: records = [] } = useOvertimeRecords();
  const createMutation = useCreateOvertime();
  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();
  const retroMutation = useRetroactiveApproveOvertime();

  const form = useForm<OvertimeInput>({ resolver: zodResolver(overtimeSchema) });

  const filtered = search
    ? requests.filter((r: any) => r.reason?.toLowerCase().includes(search.toLowerCase()))
    : requests;

  async function onSubmit(data: OvertimeInput) {
    createMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2">
        {[
          { href: '/attendance', label: 'Absensi' },
          { href: '/attendance/overtime', label: 'Lembur' },
          { href: '/attendance/shifts', label: 'Shift' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${
              pathname === tab.href
                ? 'bg-card text-foreground border border-b-0 border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Lembur</h2>
          <p className="text-sm text-muted-foreground">Ajukan dan kelola lembur</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajukan Lembur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pengajuan Lembur</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ot-date">Tanggal</Label>
                <Input id="ot-date" type="date" {...form.register('date')} />
                {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ot-start">Mulai</Label>
                  <Input id="ot-start" type="time" {...form.register('startTime')} />
                  {form.formState.errors.startTime && <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ot-end">Selesai</Label>
                  <Input id="ot-end" type="time" {...form.register('endTime')} />
                  {form.formState.errors.endTime && <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ot-reason">Alasan</Label>
                <textarea
                  id="ot-reason"
                  {...form.register('reason')}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Menyimpan…' : 'Ajukan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          title={search ? 'Tidak ada hasil' : 'Belum ada pengajuan lembur'}
          description={search ? 'Tidak ada lembur yang sesuai dengan filter.' : 'Ajukan lembur untuk memulai.'}
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    {r.startTime?.slice(0, 5)}–{r.endTime?.slice(0, 5)}
                    {r.totalMinutes ? ` (${Math.round(r.totalMinutes / 60)}h)` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{r.reason || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={(statusVariant[r.status] || 'secondary') as any}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => approveMutation.mutate(r.id, { onSuccess: () => refetch() })}>
                          Setujui
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const reason = window.prompt('Alasan penolakan');
                            if (reason) rejectMutation.mutate({ id: r.id, reason }, { onSuccess: () => refetch() });
                          }}
                        >
                          Tolak
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Rekapitulasi Lembur (Payable)</h3>
        {records.length === 0 ? (
          <EmptyState title="Belum ada rekapitulasi" description="Rekapitulasi terbentuk setelah pencocokan clock-out dengan rencana." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Rencana</TableHead>
                  <TableHead>Aktual</TableHead>
                  <TableHead>Payable</TableHead>
                  <TableHead>Jenis Hari</TableHead>
                  <TableHead>Dibayar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec: any) => (
                  <TableRow key={rec.id}>
                    <TableCell>{new Date(rec.date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>{Math.round(rec.plannedMinutes / 60 * 10) / 10}j</TableCell>
                    <TableCell>{Math.round(rec.actualMinutes / 60 * 10) / 10}j</TableCell>
                    <TableCell className="font-semibold">{Math.round(rec.payableMinutes / 60 * 10) / 10}j</TableCell>
                    <TableCell>
                      <Badge variant={rec.dayType === 'HARI_KERJA' ? 'secondary' : 'warning'}>{rec.dayType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.isPaid ? 'success' : 'destructive'}>{rec.isPaid ? 'Ya' : 'Tidak'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
