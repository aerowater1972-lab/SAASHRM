'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTodayStatus, useAttendanceRecords, useClockIn, useClockOut } from '@/lib/hooks/attendance';
import { fetchMyPpeCompliance } from '@/lib/api/employee-relations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Clock, MapPin, Search, ShieldAlert, ShieldOff } from 'lucide-react';

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  PRESENT: 'success',
  LATE: 'warning',
  EARLY_LEAVE: 'warning',
  ABSENT: 'destructive',
  LEAVE: 'secondary',
  BUSINESS_TRIP: 'info',
  REMOTE: 'info',
  HOLIDAY: 'secondary',
  OVERTIME: 'success',
};

export default function AttendancePage() {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState('');

  const { data: today, error: todayError, refetch: refetchToday } = useTodayStatus();
  const { data: recordsData, isLoading, error, refetch } = useAttendanceRecords({ page, limit: 20, q: search || undefined });

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const { data: ppeCheck } = useQuery({
    queryKey: ['ppe-compliance', 'me'],
    queryFn: fetchMyPpeCompliance,
    enabled: !today?.isClockedIn && !today?.isClockedOut,
    refetchInterval: 30_000,
  });

  const records = recordsData?.data ?? [];
  const total = recordsData?.meta?.total ?? 0;

  async function handleClock() {
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch {}

    const data = { method: (latitude ? 'GPS' : 'MANUAL') as 'GPS' | 'MANUAL', latitude, longitude, notes: notes || undefined };

    if (today?.isClockedIn) {
      clockOutMutation.mutate(data, { onSuccess: () => { setNotes(''); refetchToday(); refetch(); } });
    } else {
      clockInMutation.mutate(data, { onSuccess: () => { setNotes(''); refetchToday(); refetch(); } });
    }
  }

  const isClocking = clockInMutation.isPending || clockOutMutation.isPending;
  const errorMessage = todayError instanceof Error ? todayError.message : '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Absensi</h1>
        <p className="text-sm text-muted-foreground">Catat kehadiran dan lihat riwayat absensi</p>
      </div>

      {/* Sub navigation */}
      <div className="flex gap-1 border-b pb-2">
        {[
          { href: '/attendance', label: 'Absensi' },
          { href: '/attendance/overtime', label: 'Lembur' },
          { href: '/attendance/shifts', label: 'Shift' },
          { href: '/attendance/rosters', label: 'Roster' },
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

      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div>
      )}

      {/* Clock Card */}
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="text-5xl mb-2">
            {today?.isClockedIn ? '⏰' : '🕐'}
          </div>
          <CardTitle className="text-base">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {today?.isClockedIn
              ? `Masuk pukul ${formatTime(today.record?.clockIn)}`
              : today?.isClockedOut
              ? 'Sudah clock out hari ini'
              : 'Belum clock in'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!today?.isClockedIn && !today?.isClockedOut && ppeCheck?.blocked && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <ShieldOff className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{ppeCheck.reason}</span>
            </div>
          )}
          <Input
            placeholder="Catatan (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            className="w-full"
            size="lg"
            variant={today?.isClockedIn ? 'destructive' : 'default'}
            onClick={handleClock}
            disabled={isClocking || !!today?.isClockedOut || (!today?.isClockedIn && !!ppeCheck?.blocked)}
          >
            {!today?.isClockedIn && !today?.isClockedOut && ppeCheck?.blocked ? (
              <><ShieldOff className="mr-2 h-5 w-5" />APD Tidak Memenuhi</>
            ) : (
              <><Clock className="mr-2 h-5 w-5" />{isClocking ? 'Memproses…' : today?.isClockedIn ? 'Clock Out' : 'Clock In'}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Records */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Riwayat Absensi</h3>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari status…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        {isLoading && <TableSkeleton rows={5} columns={5} />}
        {error && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !error && records.length === 0 && (
          <EmptyState title="Belum ada riwayat absensi" description="Riwayat absensi akan muncul setelah Anda melakukan clock in." />
        )}

        {!isLoading && !error && records.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>{formatTime(r.clockIn)}</TableCell>
                    <TableCell>{formatTime(r.clockOut)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={(statusVariant[r.status] || 'secondary') as any}>
                          {r.status}
                        </Badge>
                        {r.isSuspicious && (
                          <Link href="/attendance/flagged" className="no-underline">
                            <Badge
                              variant="destructive"
                              title={[...(r.clockInFlags ?? []), ...(r.clockOutFlags ?? [])].join('\n')}
                            >
                              <ShieldAlert className="mr-1 h-3 w-3" />
                              {r.spoofReviewedAt ? 'Direview' : 'Mencurigakan'}
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.clockInMethod || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {recordsData?.meta && recordsData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Halaman {recordsData.meta.page} dari {recordsData.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Sebelumnya
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= (recordsData.meta.totalPages || 1)} onClick={() => setPage(page + 1)}>
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
