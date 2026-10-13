'use client';
import { RequirePermission } from '@/components/require-permission';
import { useState } from 'react';
import { useLiveFieldWorkers, useTerritories, useCreateTerritory, useDeleteTerritory, useViolations } from '@/lib/hooks/live-tracking';
import { mapsLink } from '@/lib/api/live-tracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState, TableSkeleton, ErrorState } from '@/components/ui/data-states';
import { ExternalLink, Trash2, Plus, MapPin } from 'lucide-react';

const timeAgo = (iso?: string) => {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
};

export default function LiveTrackingPage() {
  return <RequirePermission permission="attendance:live-tracking:read"><LiveTrackingInner /></RequirePermission>;
}

function LiveTrackingInner() {
  const [tab, setTab] = useState<'live' | 'territories' | 'violations'>('live');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Tracking</h1>
        <p className="text-sm text-muted-foreground">Pantau karyawan lapangan real-time, kelola wilayah kerja, dan tinjau pelanggaran.</p>
      </div>
      <div className="flex gap-2 border-b">
        {([
          ['live', 'Monitoring Real-time'],
          ['territories', 'Wilayah Kerja'],
          ['violations', 'Pelanggaran'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'live' && <LiveTab />}
      {tab === 'territories' && <TerritoriesTab />}
      {tab === 'violations' && <ViolationsTab />}
    </div>
  );
}

function LiveTab() {
  const { data = [], isLoading, error } = useLiveFieldWorkers();
  if (isLoading) return <TableSkeleton columns={4} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (data.length === 0) return <EmptyState title="Belum ada karyawan lapangan aktif" description="Tandai karyawan sebagai field worker dan pastikan mereka mengirim ping lokasi." />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Karyawan Lapangan ({data.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Lokasi Terakhir</TableHead>
                <TableHead>Update</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.fullName}</TableCell>
                  <TableCell>{w.employeeId}</TableCell>
                  <TableCell>
                    {w.lastPing ? (
                      <span className="text-sm">{w.lastPing.lat.toFixed(4)}, {w.lastPing.lng.toFixed(4)}
                        {w.lastPing.accuracyMeters != null && <span className="text-muted-foreground"> (±{Math.round(w.lastPing.accuracyMeters)}m)</span>}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeAgo(w.lastPing?.recordedAt)}</TableCell>
                  <TableCell>
                    {w.lastPing && (
                      <a href={mapsLink(w.lastPing.lat, w.lastPing.lng)} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5" /> Peta <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


function TerritoriesTab() {
  const { data = [], isLoading, error } = useTerritories();
  const createMut = useCreateTerritory();
  const deleteMut = useDeleteTerritory();
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [geojson, setGeojson] = useState('');

  const submit = async () => {
    if (!employeeId.trim() || !name.trim() || !geojson.trim()) return;
    try {
      JSON.parse(geojson); // validasi GeoJSON sebelum kirim
      await createMut.mutateAsync({ employeeId: employeeId.trim(), territoryName: name.trim(), boundaryGeoJson: geojson.trim() });
      setEmployeeId(''); setName(''); setGeojson('');
    } catch {
      alert('GeoJSON tidak valid. Gunakan format Polygon/MultiPolygon.');
    }
  };

  if (isLoading) return <TableSkeleton columns={3} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Tambah Wilayah Kerja</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            <Input placeholder="Nama wilayah" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <textarea
            rows={4}
            placeholder='GeoJSON Polygon, mis: {"type":"Polygon","coordinates":[[[lng,lat],...]]}'
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={geojson}
            onChange={(e) => setGeojson(e.target.value)}
          />
          <Button onClick={submit} disabled={createMut.isPending}><Plus className="h-4 w-4 mr-1" /> Simpan Wilayah</Button>
        </CardContent>
      </Card>
      {data.length === 0 ? (
        <EmptyState title="Belum ada wilayah" description="Definisikan wilayah kerja untuk karyawan lapangan." />
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Karyawan</TableHead><TableHead>Wilayah</TableHead><TableHead></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.employee?.fullName ?? t.employeeId}</TableCell>
                      <TableCell>{t.territoryName}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" disabled={deleteMut.isPending} onClick={() => { if (confirm('Hapus wilayah ini?')) deleteMut.mutate(t.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ViolationsTab() {
  const [onlyUnnotified, setOnlyUnnotified] = useState(false);
  const { data, isLoading, error } = useViolations({ notified: onlyUnnotified ? false : undefined, limit: 100 });
  if (isLoading) return <TableSkeleton columns={5} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  const rows = data?.data ?? [];
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyUnnotified} onChange={(e) => setOnlyUnnotified(e.target.checked)} />
        Hanya yang belum dinotifikasi
      </label>
      {rows.length === 0 ? (
        <EmptyState title="Tidak ada pelanggaran" description="Belum ada karyawan keluar dari wilayah kerjanya." />
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Wilayah</TableHead>
                    <TableHead>Jarak</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Notifikasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>{v.employee?.fullName ?? v.employeeId}</TableCell>
                      <TableCell>{v.territory?.territoryName ?? '-'}</TableCell>
                      <TableCell>±{Math.round(v.distanceMeters)} m</TableCell>
                      <TableCell>
                        <a href={mapsLink(v.lat, v.lng)} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-sm">
                          <MapPin className="h-3.5 w-3.5" /> Peta <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(v.recordedAt).toLocaleString('id-ID')}</TableCell>
                      <TableCell><Badge variant={v.notified ? 'success' : 'secondary'}>{v.notified ? 'Terkirim' : 'Belum'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

