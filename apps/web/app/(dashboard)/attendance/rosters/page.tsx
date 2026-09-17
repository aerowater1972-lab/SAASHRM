'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRosters, useCreateRoster, useRoster, useAddRosterEntries, useShifts } from '@/lib/hooks/attendance';
import { useEmployees } from '@/lib/hooks/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export default function RostersPage() {
  const pathname = usePathname();
  const { data: rosters = [], isLoading, error: queryError, refetch } = useRosters();
  const { data: shifts = [] } = useShifts();
  const { data: employeesData } = useEmployees({ limit: 100 } as any);
  const employees: any[] = (employeesData as any)?.data ?? (Array.isArray(employeesData) ? (employeesData as any) : []);

  const createRoster = useCreateRoster();
  const addEntries = useAddRosterEntries();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [entry, setEntry] = useState({ employeeId: '', shiftId: '', date: '' });

  const { data: detail, refetch: refetchDetail } = useRoster(selectedId);
  const entries: any[] = (detail as any)?.entries ?? [];

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const created: any = await createRoster.mutateAsync(form);
      setDialogOpen(false);
      setForm({ name: '', description: '', startDate: '', endDate: '' });
      refetch();
      if (created?.id) setSelectedId(created.id);
    } catch (e: any) { setError(e.message); }
  }

  async function onAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    try {
      await addEntries.mutateAsync({ rosterId: selectedId, entries: [entry] });
      setEntry({ employeeId: '', shiftId: '', date: '' });
      refetchDetail();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2">
        {[
          { href: '/attendance', label: 'Absensi' },
          { href: '/attendance/overtime', label: 'Lembur' },
          { href: '/attendance/shifts', label: 'Shift' },
          { href: '/attendance/rosters', label: 'Roster' },
        ].map((tab) => (
          <Link key={tab.href} href={tab.href}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md no-underline transition-colors ${
              pathname === tab.href ? 'bg-card text-foreground border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >{tab.label}</Link>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Roster</h2>
          <p className="text-sm text-muted-foreground">Penjadwalan shift karyawan per periode</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Buat Roster</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat Roster</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2"><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Roster September Pekan 3" /></div>
              <div className="space-y-2"><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opsional" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Tanggal Mulai</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Tanggal Selesai</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
              </div>
              <Button type="submit">Buat</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(error || queryError) && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error || (queryError as any)?.message}</div>}

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {queryError && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !queryError && rosters.length === 0 && (
        <EmptyState title="Belum ada roster" description="Buat roster untuk mulai menjadwalkan shift." />
      )}

      {!isLoading && !queryError && rosters.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Daftar Roster</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Periode</TableHead><TableHead>Entri</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(rosters as any[]).map((r: any) => (
                    <TableRow key={r.id} className={`cursor-pointer ${selectedId === r.id ? 'bg-muted' : ''}`} onClick={() => setSelectedId(r.id)}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs">{new Date(r.startDate).toLocaleDateString('id-ID')} – {new Date(r.endDate).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell><Badge variant="secondary">{r.entries?.length ?? r._count?.entries ?? 0}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Penugasan Shift</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!selectedId && <p className="text-sm text-muted-foreground">Pilih roster di samping untuk melihat dan menambah penugasan.</p>}
              {selectedId && (
                <>
                  <form onSubmit={onAddEntry} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div className="space-y-1"><Label>Karyawan</Label>
                      <select className={inputCls} value={entry.employeeId} onChange={(e) => setEntry({ ...entry, employeeId: e.target.value })} required>
                        <option value="">Pilih…</option>
                        {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeId})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><Label>Shift</Label>
                      <select className={inputCls} value={entry.shiftId} onChange={(e) => setEntry({ ...entry, shiftId: e.target.value })} required>
                        <option value="">Pilih…</option>
                        {(shifts as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><Label>Tanggal</Label><Input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} required /></div>
                    <Button type="submit">Tambah</Button>
                  </form>
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada penugasan pada roster ini.</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Karyawan</TableHead><TableHead>Shift</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {entries.map((en: any) => (
                          <TableRow key={en.id}>
                            <TableCell className="text-xs">{new Date(en.date).toLocaleDateString('id-ID')}</TableCell>
                            <TableCell className="font-medium text-xs">{en.employee?.fullName}</TableCell>
                            <TableCell className="text-xs">{en.shift?.name}</TableCell>
                            <TableCell><Badge variant="secondary">{en.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
