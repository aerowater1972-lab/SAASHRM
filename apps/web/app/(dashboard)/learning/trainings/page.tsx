'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTrainingSchema, type CreateTrainingInput } from '@/lib/schemas/benefits';
import { useTrainings, useCreateTraining } from '@/lib/hooks/benefits';
import { useViolationCategories } from '@/lib/hooks/employee-relations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Search } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  UPCOMING: 'warning',
};

export default function TrainingsPage() {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { rows: trainings, total, page, setPage, search, setSearch, isLoading, error, refetch } = useTrainings();
  const createMutation = useCreateTraining();
  const { data: violationCats = [] } = useViolationCategories();

  const form = useForm<CreateTrainingInput>({
    resolver: zodResolver(createTrainingSchema),
    defaultValues: { title: '', description: '', category: 'GENERAL', type: 'ONLINE', startDate: '', endDate: '' },
  });

  async function onSubmit(data: CreateTrainingInput) {
    createMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border-b pb-2">
        <Link href="/learning/trainings" className={`text-sm no-underline ${pathname === '/learning/trainings' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Pelatihan</Link>
        <Link href="/learning/certifications" className={`text-sm no-underline ${pathname.startsWith('/learning/certifications') ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Sertifikasi</Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Pelatihan</h2>
          <p className="text-sm text-muted-foreground">Kelola program pelatihan karyawan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Pelatihan Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Pelatihan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="t-title">Judul</Label>
                <Input id="t-title" {...form.register('title')} placeholder="e.g. Leadership Training" />
                {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-desc">Deskripsi</Label>
                <Input id="t-desc" {...form.register('description')} placeholder="Deskripsi pelatihan" />
                {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-cat">Kategori</Label>
                <Controller control={form.control} name="category" render={({ field }) => (
                  <Select value={field.value ?? 'GENERAL'} onValueChange={field.onChange}>
                    <SelectTrigger id="t-cat"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="K3">K3</SelectItem>
                      <SelectItem value="MANAGEMENT">Management</SelectItem>
                      <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              {form.watch('category') === 'K3' && (
                <div className="space-y-2">
                  <Label htmlFor="t-vcat">Rekomendasi Kategori Pelanggaran</Label>
                  <Controller control={form.control} name="recommendedViolationCategoryId" render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="t-vcat"><SelectValue placeholder="Opsional — hubungkan ke kategori pelanggaran" /></SelectTrigger>
                      <SelectContent>
                        {violationCats.map((vc: any) => (
                          <SelectItem key={vc.id} value={vc.id}>{vc.name} ({vc.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="t-type">Tipe</Label>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="t-type"><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONLINE">Online</SelectItem>
                        <SelectItem value="OFFLINE">Offline</SelectItem>
                        <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="t-start">Tanggal Mulai</Label>
                  <Input id="t-start" type="date" {...form.register('startDate')} />
                  {form.formState.errors.startDate && <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-end">Tanggal Selesai</Label>
                  <Input id="t-end" type="date" {...form.register('endDate')} />
                  {form.formState.errors.endDate && <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-max">Maks. Peserta</Label>
                <Input id="t-max" type="number" {...form.register('maxParticipants', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} placeholder="0 = tidak terbatas" />
                {form.formState.errors.maxParticipants && <p className="text-xs text-destructive">{form.formState.errors.maxParticipants.message}</p>}
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari judul, tipe, status…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && trainings.length === 0 && (
        <EmptyState title="Belum ada pelatihan" description="Buat pelatihan pertama untuk memulai program pengembangan." />
      )}

      {!isLoading && !error && trainings.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Judul</th>
                    <th className="px-4 py-3 font-medium">Kategori</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Periode</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trainings.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/learning/trainings/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                      </td>
                      <td className="px-4 py-3">
                        {t.category === 'K3' ? <Badge variant="success" className="text-[10px]">K3</Badge> : t.category ? <Badge variant="secondary" className="text-[10px]">{t.category}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{t.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(t.startDate).toLocaleDateString('id-ID')} – {new Date(t.endDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[t.status] || 'secondary') as any}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
    </div>
  );
}
