'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Fingerprint, ScanFace, Loader2, CheckCircle2, AlertCircle, Search, Power, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FaceCapture } from '@/components/biometric/face-capture';
import { fetchEmployees } from '@/lib/api/employees';
import { BiometricType } from '@/lib/api/biometric';
import {
  useEnrollBiometricForEmployee,
  useBiometricsForEmployee,
  useSetBiometricActive,
  useDeleteBiometricCredential,
} from '@/lib/hooks/biometric';

export default function BiometricEnrollmentPage() {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [type, setType] = useState<BiometricType>('FACE');
  const [faceOpen, setFaceOpen] = useState(false);
  const [faceResult, setFaceResult] = useState<{ photo: string; embedding: number[] } | null>(null);
  const [fingerprintTemplate, setFingerprintTemplate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ['admin', 'employees', 'search', employeeQuery],
    queryFn: () => fetchEmployees({ q: employeeQuery, limit: 20 }),
  });

  const enrollMutation = useEnrollBiometricForEmployee();
  const credentialsQuery = useBiometricsForEmployee(selectedEmployee?.id);
  const setActiveMutation = useSetBiometricActive(selectedEmployee?.id);
  const deleteMutation = useDeleteBiometricCredential(selectedEmployee?.id);

  const employeeOptions = useMemo(
    () => employeesQuery.data?.data ?? [],
    [employeesQuery.data],
  );

  // Auto-select the first match when searching.
  useEffect(() => {
    if (employeeOptions.length === 1 && !selectedEmployee) {
      const e = employeeOptions[0];
      setSelectedEmployee({ id: e.id, name: e.fullName });
    }
  }, [employeeOptions, selectedEmployee]);

  const handleFaceCapture = (result: { photo: string; embedding: number[] }) => {
    setFaceResult(result);
    setFaceOpen(false);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!selectedEmployee) {
      setError('Pilih karyawan terlebih dahulu.');
      return;
    }

    let reference = '';
    if (type === 'FACE') {
      if (!faceResult) {
        setError('Ambil wajah karyawan terlebih dahulu.');
        return;
      }
      reference = JSON.stringify(faceResult.embedding);
    } else {
      const tpl = fingerprintTemplate.trim();
      if (!tpl) {
        setError('Masukkan template sidik jari dari mesin absen.');
        return;
      }
      reference = tpl;
    }

    enrollMutation.mutate(
      { employeeId: selectedEmployee.id, type, reference, deviceId: 'admin-web' },
      {
        onSuccess: () => {
          setFaceResult(null);
          setFingerprintTemplate('');
        },
        onError: (e: any) => {
          setError(e?.response?.data?.message ?? e?.message ?? 'Gagal mendaftarkan biometrik.');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Enrollment Biometrik</h1>
        <p className="text-sm text-muted-foreground">
          Daftarkan template sidik jari atau embedding wajah untuk karyawan lain (HR / Admin).
        </p>
      </div>

      {/* Employee picker */}
      <Card className="space-y-3 p-4">
        <label className="text-sm font-medium">Pilih Karyawan</label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Cari nama atau NIK karyawan..."
            value={employeeQuery}
            onChange={(e) => setEmployeeQuery(e.target.value)}
          />
        </div>

        {employeesQuery.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Mencari...
          </div>
        )}

        {employeesQuery.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Gagal memuat daftar karyawan.
          </div>
        )}

        {employeeOptions.length > 0 && (
          <div className="max-h-56 space-y-1 overflow-auto">
            {employeeOptions.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedEmployee({ id: e.id, name: e.fullName })}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                  selectedEmployee?.id === e.id
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:bg-accent'
                }`}
              >
                <span>
                  <span className="font-medium">{e.fullName}</span>
                  <span className="ml-2 text-muted-foreground">{e.employeeId}</span>
                </span>
                {selectedEmployee?.id === e.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {selectedEmployee && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Terpilih:</span>
            <Badge variant="secondary">{selectedEmployee.name}</Badge>
          </div>
        )}
      </Card>

      {/* Type selector */}
      <Card className="space-y-3 p-4">
        <label className="text-sm font-medium">Jenis Biometrik</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === 'FACE' ? 'default' : 'outline'}
            onClick={() => setType('FACE')}
            className="flex-1"
          >
            <ScanFace className="mr-2 h-4 w-4" /> Wajah
          </Button>
          <Button
            type="button"
            variant={type === 'FINGERPRINT' ? 'default' : 'outline'}
            onClick={() => setType('FINGERPRINT')}
            className="flex-1"
          >
            <Fingerprint className="mr-2 h-4 w-4" /> Sidik Jari
          </Button>
        </div>

        {type === 'FACE' ? (
          <div className="space-y-2">
            <Button type="button" variant="outline" onClick={() => setFaceOpen(true)} className="w-full">
              <ScanFace className="mr-2 h-4 w-4" />
              {faceResult ? 'Ambil Ulang Wajah' : 'Ambil Wajah'}
            </Button>
            {faceResult && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Wajah berhasil di-capture ({faceResult.embedding.length} dimensi).
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              aria-label="Template sidik jari"
              className="h-32 w-full rounded-md border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder="Tempel template sidik jari (format mesin absen) di sini, atau unggah file template."
              value={fingerprintTemplate}
              onChange={(e) => setFingerprintTemplate(e.target.value)}
            />
            <input
              type="file"
              accept=".txt,.json,.dat"
              className="block w-full text-xs text-muted-foreground"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFingerprintTemplate(await file.text());
              }}
            />
          </div>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {enrollMutation.isSuccess && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Biometrik berhasil didaftarkan untuk {selectedEmployee?.name}.
        </div>
      )}

      <Button onClick={handleSubmit} disabled={enrollMutation.isPending} className="w-full">
        {enrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Daftarkan Biometrik
      </Button>

      {/* Existing credentials */}
      {selectedEmployee && (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-medium">
            Biometrik Terdaftar — {selectedEmployee.name}
          </h2>
          {credentialsQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
            </div>
          )}
          {credentialsQuery.isError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> Gagal memuat data biometrik.
            </div>
          )}
          {credentialsQuery.data && credentialsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada biometrik terdaftar.</p>
          )}
          {credentialsQuery.data && credentialsQuery.data.length > 0 && (
            <div className="space-y-2">
              {credentialsQuery.data.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {c.type === 'FACE' ? (
                      <ScanFace className="h-4 w-4 text-primary" />
                    ) : (
                      <Fingerprint className="h-4 w-4 text-primary" />
                    )}
                    <span>{c.type === 'FACE' ? 'Wajah' : 'Sidik Jari'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.enrolledAt).toLocaleDateString('id-ID')}
                    </span>
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>
                      {c.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={c.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      disabled={setActiveMutation.isPending}
                      onClick={() => setActiveMutation.mutate({ id: c.id, isActive: !c.isActive })}
                    >
                      <Power className={`h-4 w-4 ${c.isActive ? 'text-amber-600' : 'text-green-600'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Hapus"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Hapus biometrik ${c.type === 'FACE' ? 'Wajah' : 'Sidik Jari'} untuk ${selectedEmployee.name}? Tindakan ini permanen.`,
                          )
                        ) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <FaceCapture open={faceOpen} onOpenChange={setFaceOpen} onCapture={handleFaceCapture} />
    </div>
  );
}
