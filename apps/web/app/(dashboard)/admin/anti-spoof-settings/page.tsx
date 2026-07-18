'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useAntiSpoofSettings,
  useUpdateAntiSpoofSettings,
} from '@/lib/hooks/biometric';
import type { AntiSpoofUpdate } from '@/lib/api/biometric';
import { hasPermission } from '@/lib/api';

type FieldKey = 'maxGpsAccuracy' | 'maxClockSkewMs' | 'maxTravelSpeedKmh';

const FIELDS: {
  key: FieldKey;
  label: string;
  unit: string;
  hint: string;
}[] = [
  {
    key: 'maxGpsAccuracy',
    label: 'Akurasi GPS Maksimum',
    unit: 'meter',
    hint: 'Presensi dengan radius akurasi lebih besar dari nilai ini ditandai mencurigakan (indikasi mock-location).',
  },
  {
    key: 'maxClockSkewMs',
    label: 'Selisih Jam Klien Maksimum',
    unit: 'milidetik',
    hint: 'Selisih waktu perangkat vs server yang melebihi nilai ini ditandai (indikasi manipulasi waktu perangkat).',
  },
  {
    key: 'maxTravelSpeedKmh',
    label: 'Kecepatan Perpindahan Maksimum',
    unit: 'km/jam',
    hint: 'Perpindahan lokasi antar presensi yang melebihi kecepatan ini ditandai (indikasi GPS spoofing).',
  },
];

export default function AntiSpoofSettingsPage() {
  const canManage = hasPermission('attendance:biometric:enroll');
  const settingsQuery = useAntiSpoofSettings();
  const updateMutation = useUpdateAntiSpoofSettings();

  const [form, setForm] = useState<Record<FieldKey, string>>({
    maxGpsAccuracy: '',
    maxClockSkewMs: '',
    maxTravelSpeedKmh: '',
  });
  const [error, setError] = useState<string | null>(null);

  const overrides = settingsQuery.data?.overrides;

  useEffect(() => {
    if (!overrides) return;
    setForm({
      maxGpsAccuracy: overrides.maxGpsAccuracy != null ? String(overrides.maxGpsAccuracy) : '',
      maxClockSkewMs: overrides.maxClockSkewMs != null ? String(overrides.maxClockSkewMs) : '',
      maxTravelSpeedKmh:
        overrides.maxTravelSpeedKmh != null ? String(overrides.maxTravelSpeedKmh) : '',
    });
  }, [overrides]);

  const handleSubmit = () => {
    setError(null);
    const payload: AntiSpoofUpdate = {};
    for (const f of FIELDS) {
      const raw = form[f.key].trim();
      if (raw === '') {
        payload[f.key] = null;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        setError(`${f.label} harus berupa angka positif (kosongkan untuk memakai default).`);
        return;
      }
      payload[f.key] = n;
    }

    updateMutation.mutate(payload, {
      onError: (e: any) => setError(e?.message ?? 'Gagal menyimpan pengaturan.'),
    });
  };

  const handleReset = () => {
    setForm({ maxGpsAccuracy: '', maxClockSkewMs: '', maxTravelSpeedKmh: '' });
  };

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="flex items-center gap-2 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Anda tidak memiliki izin untuk mengakses pengaturan ini.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Pengaturan Anti Fake-GPS</h1>
          <p className="text-sm text-muted-foreground">
            Sesuaikan ambang deteksi presensi mencurigakan per-tenant. Kosongkan sebuah kolom untuk
            memakai nilai default sistem.
          </p>
        </div>
      </div>

      {settingsQuery.isLoading && (
        <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat pengaturan...
        </Card>
      )}

      {settingsQuery.isError && (
        <Card className="flex items-center gap-2 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Gagal memuat pengaturan anti-spoof.
        </Card>
      )}

      {settingsQuery.data && (
        <>
          <Card className="space-y-4 p-4">
            {FIELDS.map((f) => {
              const effective = settingsQuery.data!.effective[f.key];
              const def = settingsQuery.data!.defaults[f.key];
              const isOverridden = form[f.key].trim() !== '';
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {f.label}{' '}
                      <span className="text-muted-foreground">({f.unit})</span>
                    </label>
                    <Badge variant={isOverridden ? 'default' : 'secondary'}>
                      {isOverridden ? 'Kustom' : 'Default'}
                    </Badge>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    step="any"
                    inputMode="numeric"
                    placeholder={`Default: ${def}`}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                  <p className="text-xs text-muted-foreground">
                    Berlaku saat ini:{' '}
                    <span className="font-medium text-foreground">{effective}</span> {f.unit} ·
                    default sistem: {def} {f.unit}
                  </p>
                </div>
              );
            })}
          </Card>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {updateMutation.isSuccess && !error && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Pengaturan anti-spoof berhasil disimpan.
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={updateMutation.isPending}
              title="Kosongkan semua override (pakai default sistem)"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset ke Default
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
