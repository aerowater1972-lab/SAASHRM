'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useIncidentReports,
  useCreateIncidentReport,
  useUpdateIncidentReport,
} from '@/lib/hooks/employee-relations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

const sevBadge = (s: string) => {
  const m: Record<string, string> = {
    CRITICAL: 'destructive',
    SEVERE: 'destructive',
    MODERATE: 'secondary',
    MILD: 'success',
  };
  return <Badge variant={(m[s] || 'secondary') as any}>{s}</Badge>;
};

const catBadge = (c: string) =>
  c === 'ACCIDENT' ? (
    <Badge variant="destructive">Kecelakaan</Badge>
  ) : (
    <Badge variant="secondary">Near-Miss</Badge>
  );

export default function IncidentReportsPage() {
  const pathname = usePathname();
  const { data: reports = [], isLoading, error, refetch } = useIncidentReports();
  const createMutation = useCreateIncidentReport();
  const updateMutation = useUpdateIncidentReport();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    location: '',
    incidentDate: '',
    severity: 'MILD',
    category: 'ACCIDENT',
    description: '',
  });

  async function handleCreate() {
    if (!form.employeeId || !form.location || !form.incidentDate || !form.description) {
      setErr('Field wajib');
      return;
    }
    setErr('');
    try {
      await createMutation.mutateAsync(form);
      setDialogOpen(false);
      setForm({
        employeeId: '',
        location: '',
        incidentDate: '',
        severity: 'MILD',
        category: 'ACCIDENT',
        description: '',
      });
      refetch();
      toast('Insiden berhasil dilaporkan', 'success');
    } catch (e: any) {
      setErr(e.message);
      toast(e.message, 'error');
    }
  }

  async function handleResolve(id: string) {
    try {
      await updateMutation.mutateAsync({ id, data: { status: 'RESOLVED' } });
      refetch();
      toast('Insiden ditutup', 'success');
    } catch (e: any) {
      setErr(e.message);
      toast(e.message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-2 flex-wrap">
        {tabs.map((tab) => (
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
          <h2 className="text-xl font-semibold">Laporan Insiden Kerja</h2>
          <p className="text-sm text-muted-foreground">Kecelakaan kerja dan near-miss</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv(
                reports.map((r: any) => ({
                  employee: r.employee?.fullName ?? '',
                  category: r.category,
                  severity: r.severity,
                  location: r.location,
                  status: r.status,
                  date: new Date(r.incidentDate).toLocaleDateString('id-ID'),
                  description: r.description,
                })),
                'incident-reports'
              )
            }
          >
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) setErr('');
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Laporkan Insiden
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Laporkan Insiden Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <EmployeeSearch
                  value={form.employeeId}
                  onChange={(id) => setForm((f) => ({ ...f, employeeId: id }))}
                  label="Karyawan (pelapor)"
                />
                <div className="space-y-2">
                  <Label>Lokasi</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Gudang Utama Lt.2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Input
                      type="date"
                      value={form.incidentDate}
                      onChange={(e) => setForm((f) => ({ ...f, incidentDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="ACCIDENT">Kecelakaan</option>
                      <option value="NEAR_MISS">Near-Miss</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tingkat Keparahan</Label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="MILD">Ringan</option>
                    <option value="MODERATE">Sedang</option>
                    <option value="SEVERE">Berat</option>
                    <option value="CRITICAL">Kritis</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <textarea aria-label="Deskripsi"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button onClick={handleCreate}>Laporkan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {(err || error) && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {err || (error as any)?.message}
        </div>
      )}

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && reports.length === 0 && (
        <EmptyState
          title="Belum ada laporan insiden"
          description="Laporkan insiden pertama."
        />
      )}

      {!isLoading && !error && reports.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelapor</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Severitas</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.employee?.fullName || r.employeeId}
                  </TableCell>
                  <TableCell>{catBadge(r.category)}</TableCell>
                  <TableCell>{sevBadge(r.severity)}</TableCell>
                  <TableCell className="text-sm">{r.location}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(r.incidentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'REPORTED' && (
                      <Button variant="outline" size="sm" onClick={() => handleResolve(r.id)}>
                        Tutup
                      </Button>
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
