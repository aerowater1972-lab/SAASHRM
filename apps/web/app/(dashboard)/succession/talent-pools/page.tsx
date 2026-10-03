'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Users2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TableSkeleton, EmptyState } from '@/components/ui/data-states';
import { useToast } from '@/lib/toast';
import { useTalentPools, useCreateTalentPool, useDeleteTalentPool } from '@/lib/hooks/use-succession';
import type { TalentPool } from '@/lib/api/succession';

export default function TalentPoolsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState('');

  const { data: pools, isLoading, error } = useTalentPools({ search: search || undefined, status: status || undefined });
  const createPool = useCreateTalentPool();
  const deletePool = useDeleteTalentPool();
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createPool.mutateAsync({ name, description: description || undefined, criteria: criteria || undefined });
      toast('Talent pool dibuat', 'success');
      setShowNew(false);
      setName(''); setDescription(''); setCriteria('');
    } catch (e: any) {
      toast(e?.message ?? 'Gagal membuat talent pool', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Talent Pools</h1>
          <p className="text-sm text-muted-foreground">Kumpulan karyawan berbakat untuk pengembangan & suksesi</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Pool Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Buat Talent Pool</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="poolName">Nama Pool</Label>
                <Input id="poolName" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Fast Track Leadership" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poolDesc">Deskripsi</Label>
                <textarea id="poolDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Tujuan dan cakupan pool..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poolCriteria">Kriteria</Label>
                <textarea id="poolCriteria" value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Kriteria seleksi (kinerja, potensi, kesiapan)..." />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Batal</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={saving || !name.trim()}>Simpan</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari pool..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="ARCHIVED">Diarsipkan</option>
        </select>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <div className="text-destructive">Gagal memuat talent pools.</div>}
      {!isLoading && (!pools || pools.length === 0) && (
        <EmptyState title="Belum ada talent pool" description="Buat pool untuk menampung karyawan berpotensi tinggi." action={{ label: 'Buat Pool', onClick: () => setShowNew(true) }} />
      )}

      {!isLoading && pools && pools.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool: TalentPool) => (
            <Card key={pool.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <button className="flex-1 text-left" onClick={() => router.push(`/succession/talent-pools/${pool.id}`)}>
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{pool.name}</span>
                    <Badge variant={pool.status === 'ACTIVE' ? 'success' : 'secondary'}>{pool.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{pool.description ?? 'Tidak ada deskripsi'}</p>
                  <div className="mt-1 text-xs text-muted-foreground">{pool._count?.members ?? 0} anggota</div>
                </button>
                <Button size="icon" variant="ghost" title="Hapus" onClick={() => deletePool.mutateAsync(pool.id).then(() => toast('Pool dihapus', 'success'))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}