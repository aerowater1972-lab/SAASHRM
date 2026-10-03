'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useViolationCategories, useCreateViolationCategory, useK3TrainingRecommendations } from '@/lib/hooks/employee-relations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Plus, GraduationCap, X } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib'),
  code: z.string().min(1, 'Kode wajib'),
  description: z.string().optional(),
  severity: z.number().int().min(1).max(3),
  canSkipSP1: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;
const defaultValues: FormData = { name: '', code: '', description: '', severity: 1, canSkipSP1: false };

const tabs = [
  { href: '/employee-relations', label: 'Dashboard' },
  { href: '/employee-relations/disciplinary-cases', label: 'Surat Peringatan' },
  { href: '/employee-relations/grievances', label: 'Pengaduan' },
  { href: '/employee-relations/bipartite', label: 'LKS Bipartit' },
  { href: '/employee-relations/incident-reports', label: 'Insiden Kerja' },
  { href: '/employee-relations/ppe-assignments', label: 'APD' },
  { href: '/employee-relations/violation-categories', label: 'Kategori Pelanggaran' },
];

const severityLabel = (s: number) => s === 3 ? 'Berat' : s === 2 ? 'Sedang' : 'Ringan';

export default function ViolationCategoriesPage() {
  const pathname = usePathname();
  const { data: items = [], isLoading, error, refetch } = useViolationCategories();
  const createMutation = useCreateViolationCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [err, setErr] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const { data: recommendations } = useK3TrainingRecommendations(selectedCat ?? undefined);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });

  async function onSubmit(data: FormData) {
    setErr('');
    try {
      await createMutation.mutateAsync(data);
      setDialogOpen(false);
      form.reset(defaultValues);
      refetch();
    } catch (e: any) { setErr(e.message); }
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

      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-semibold">Kategori Pelanggaran</h2><p className="text-sm text-muted-foreground">Konfigurasi jenis pelanggaran & skema eskalasi SP</p></div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { form.reset(defaultValues); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Kategori</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Kategori Pelanggaran</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input {...form.register('name')} required placeholder="Terlambat >30 menit" />
              </div>
              <div className="space-y-2">
                <Label>Kode</Label>
                <Input {...form.register('code')} required placeholder="LATE30" />
              </div>
              <div className="space-y-2">
                <Label>Tingkat Keparahan</Label>
                <select value={form.watch('severity')} onChange={e => form.setValue('severity', parseInt(e.target.value, 10))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value={1}>Ringan (1)</option>
                  <option value={2}>Sedang (2)</option>
                  <option value={3}>Berat (3) — bisa langsung SP2/SP3</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Input {...form.register('description')} placeholder="Opsional" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Langsung SP2/SP3 (skip SP1)</Label>
                <Switch checked={Boolean(form.watch('canSkipSP1'))} onCheckedChange={(v) => form.setValue('canSkipSP1', v)} />
              </div>
              <Button type="submit">Tambah</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {(err || error) && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{err || (error as any)?.message}</div>}
      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !error && items.length === 0 && <EmptyState title="Belum ada kategori" description="Tambah kategori pelanggaran untuk memulai." />}
      {!isLoading && !error && items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Severitas</TableHead>
                <TableHead>Skip SP1</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cat: any) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="font-mono text-xs">{cat.code}</TableCell>
                  <TableCell><Badge variant={cat.severity >= 3 ? 'destructive' : cat.severity === 2 ? 'secondary' : 'success'}>{severityLabel(cat.severity)}</Badge></TableCell>
                  <TableCell>{cat.canSkipSP1 ? <Badge variant="destructive">Ya</Badge> : '—'}</TableCell>
                  <TableCell>{cat.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}>
                      <GraduationCap className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedCat && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium flex items-center gap-2"><GraduationCap className="h-4 w-4" />Rekomendasi Pelatihan K3</h4>
            <Button variant="ghost" size="icon" onClick={() => setSelectedCat(null)}><X className="h-4 w-4" /></Button>
          </div>
          {!recommendations ? (
            <div className="h-8 w-full bg-muted animate-pulse rounded" />
          ) : recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada pelatihan K3 yang direkomendasikan untuk kategori ini.</p>
          ) : (
            <div className="space-y-2">
              {recommendations.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                  <span>{t.title}</span>
                  <Badge variant="secondary">{t.status === 'PLANNED' ? 'Akan Datang' : 'Berlangsung'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
