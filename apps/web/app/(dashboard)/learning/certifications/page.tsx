'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCertificationSchema, type CreateCertificationInput } from '@/lib/schemas/benefits';
import { useCertificationsTable, useCreateCertification } from '@/lib/hooks/benefits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Award } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  EXPIRED: 'destructive',
  EXPIRING: 'warning',
};

export default function CertificationsPage() {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { rows: certs, total, page, setPage, search, setSearch, isLoading, error, refetch } = useCertificationsTable();
  const createMutation = useCreateCertification();

  const form = useForm<CreateCertificationInput>({
    resolver: zodResolver(createCertificationSchema),
    defaultValues: { name: '', issuer: '', certificateNumber: '', issueDate: '', expiryDate: '' },
  });

  async function onSubmit(data: CreateCertificationInput) {
    createMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border-b pb-2">
        <Link href="/learning/trainings" className={`text-sm no-underline ${pathname.startsWith('/learning/trainings') ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Pelatihan</Link>
        <Link href="/learning/certifications" className={`text-sm no-underline ${pathname === '/learning/certifications' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Sertifikasi</Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Sertifikasi</h2>
          <p className="text-sm text-muted-foreground">Kelola sertifikasi karyawan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Sertifikasi Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Sertifikasi</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cert-name">Nama Sertifikasi</Label>
                <Input id="cert-name" {...form.register('name')} placeholder="e.g. AWS Certified" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cert-issuer">Penerbit</Label>
                <Input id="cert-issuer" {...form.register('issuer')} placeholder="e.g. Amazon" />
                {form.formState.errors.issuer && <p className="text-xs text-destructive">{form.formState.errors.issuer.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cert-number">Nomor Sertifikat</Label>
                <Input id="cert-number" {...form.register('certificateNumber')} placeholder="Opsional" />
                {form.formState.errors.certificateNumber && <p className="text-xs text-destructive">{form.formState.errors.certificateNumber.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cert-issue">Tanggal Terbit</Label>
                  <Input id="cert-issue" type="date" {...form.register('issueDate')} />
                  {form.formState.errors.issueDate && <p className="text-xs text-destructive">{form.formState.errors.issueDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-expiry">Tanggal Kadaluarsa</Label>
                  <Input id="cert-expiry" type="date" {...form.register('expiryDate')} />
                  {form.formState.errors.expiryDate && <p className="text-xs text-destructive">{form.formState.errors.expiryDate.message}</p>}
                </div>
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
        <Input placeholder="Cari nama, penerbit…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && certs.length === 0 && (
        <EmptyState title="Belum ada sertifikasi" description="Tambahkan sertifikasi pertama." />
      )}

      {!isLoading && !error && certs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Penerbit</th>
                    <th className="px-4 py-3 font-medium">Tanggal Terbit</th>
                    <th className="px-4 py-3 font-medium">Kadaluarsa</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {certs.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.issuer || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(c.issueDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[c.status] || 'secondary') as any}>{c.status}</Badge>
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
