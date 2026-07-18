'use client';

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Loader2, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { useFlaggedAttendance, useReviewSpoof } from '@/lib/hooks/attendance';
import type { AttendanceRecord } from '@/lib/types';

type Filter = 'false' | 'true';

function formatDate(iso?: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso?: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function FlaggedCard({ record }: { record: AttendanceRecord }) {
  const [note, setNote] = useState('');
  const reviewMut = useReviewSpoof();
  const flags = [...(record.clockInFlags ?? []), ...(record.clockOutFlags ?? [])];
  const reviewed = !!record.spoofReviewedAt;

  const handleReview = async () => {
    try {
      await reviewMut.mutateAsync({ id: record.id, note: note.trim() || undefined });
    } catch {
      /* surfaced by mutation state */
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">
            {record.employee?.fullName ?? record.employeeId}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {record.employee?.employeeId} &middot; {formatDate(record.date)}
          </p>
        </div>
        {reviewed ? (
          <Badge variant="secondary" className="shrink-0">
            <ShieldCheck className="mr-1 h-3 w-3" /> Sudah direview
          </Badge>
        ) : (
          <Badge variant="destructive" className="shrink-0">
            <ShieldAlert className="mr-1 h-3 w-3" /> Perlu review
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Masuk {formatTime(record.clockIn)} ({record.clockInMethod ?? '-'})
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Keluar {formatTime(record.clockOut)} ({record.clockOutMethod ?? '-'})
          </span>
          {record.clockInLat != null && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {Number(record.clockInLat).toFixed(5)}, {Number(record.clockInLng).toFixed(5)}
              {record.clockInAccuracy != null && ` (±${Math.round(record.clockInAccuracy)}m)`}
            </span>
          )}
        </div>

        <ul className="space-y-1">
          {flags.map((f, i) => (
            <li key={i} className="flex items-start gap-2 rounded-md bg-destructive/10 px-2 py-1 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {reviewed ? (
          record.spoofReviewNote ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Catatan review:</span> {record.spoofReviewNote}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Direview tanpa catatan.</p>
          )
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan review (opsional)"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button onClick={handleReview} disabled={reviewMut.isPending}>
              {reviewMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Tandai sudah direview
                </>
              )}
            </Button>
          </div>
        )}
        {reviewMut.isError && (
          <p className="text-sm text-destructive">Gagal menyimpan review. Coba lagi.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function FlaggedAttendancePage() {
  const [filter, setFilter] = useState<Filter>('false');
  const { data, isLoading, isError, refetch } = useFlaggedAttendance(filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldAlert className="h-6 w-6 text-destructive" /> Presensi Mencurigakan
          </h1>
          <p className="text-sm text-muted-foreground">
            Presensi GPS yang ditandai oleh deteksi anti fake-GPS. Tidak diblokir otomatis &mdash; tinjau di sini.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'false' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('false')}>
            Perlu review
          </Button>
          <Button variant={filter === 'true' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('true')}>
            Sudah direview
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} columns={1} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={filter === 'false' ? 'Tidak ada presensi mencurigakan' : 'Belum ada yang direview'}
          description={
            filter === 'false'
              ? 'Semua presensi GPS lolos pemeriksaan anti fake-GPS.'
              : 'Presensi yang sudah ditinjau akan muncul di sini.'
          }
        />
      ) : (
        <div className="grid gap-4">
          {data.map((r) => (
            <FlaggedCard key={r.id} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}
