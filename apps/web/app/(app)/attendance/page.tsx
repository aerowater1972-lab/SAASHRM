'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerTable } from '@/hooks/use-server-table';
import { Button, Card, Pagination } from '@/components/ui';

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: string;
  method?: string;
  notes?: string;
  employee: { id: string; employeeId: string; fullName: string };
}

interface TodayStatus {
  record: AttendanceRecord | null;
  shift: any;
  isClockedIn: boolean;
  isClockedOut: boolean;
  currentTime: string;
}

export default function AttendancePage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: today, error: todayError } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get<TodayStatus>('/attendance/today'),
  });
  const [clocking, setClocking] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const { rows: records, total, page, setPage, search, setSearch, isLoading: loading, error } =
    useServerTable<any>(['attendance'], ({ page, limit, q }) =>
      api.get('/attendance/records', { params: { page, limit, q } }),
    );
  const errorMessage = error instanceof Error ? error.message : (todayError?.message || actionError || '');

  async function handleClock() {
    setClocking(true);
    setActionError('');
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {}

      const endpoint = today?.isClockedIn ? 'clock-out' : 'clock-in';
      const result = await api.post<any>(`/attendance/${endpoint}`, {
        method: latitude ? 'GPS' : 'MANUAL',
        latitude,
        longitude,
        notes: notes || undefined,
      });

      if (result?.record || result?.status) {
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
        setNotes('');
      }
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setClocking(false);
    }
  }

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div>
      <h2 className="mt-0">Attendance</h2>
      <div className="mb-6 flex gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
        <Link href="/attendance" className={`text-sm no-underline ${pathname === '/attendance' ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>Attendance</Link>
        <Link href="/attendance/overtime" className={`text-sm no-underline ${pathname.startsWith('/attendance/overtime') ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>Overtime</Link>
        <Link href="/attendance/shifts" className={`text-sm no-underline ${pathname.startsWith('/attendance/shifts') ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400'}`}>Shifts</Link>
      </div>
      {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}

      {loading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && (
        <>
          {/* Clock Card */}
          <Card className="mb-6 max-w-md text-center">
            <div className="mb-2 text-5xl">
              {today?.isClockedIn ? '⏰' : '🕐'}
            </div>
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="mb-5 text-xs text-gray-500 dark:text-gray-400">
              {today?.isClockedIn
                ? `Clocked in at ${formatTime(today.record?.clockIn)}`
                : today?.isClockedOut
                  ? "Already clocked out today"
                  : "Not yet clocked in"}
            </div>

            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />

            <button
              onClick={handleClock}
              disabled={clocking || today?.isClockedOut}
              className="w-full rounded-lg border-none px-4 py-3.5 text-base font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: today?.isClockedIn ? '#e74c3c' : '#27ae60',
              }}
            >
              {clocking ? 'Processing…' : today?.isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>
          </Card>

          {/* Recent Records */}
          <h3 className="mb-3">Recent Records</h3>
          <input
            type="text" placeholder="Search status or method…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="py-2 font-medium">Date</th>
                <th className="font-medium">Clock In</th>
                <th className="font-medium">Clock Out</th>
                <th className="font-medium">Status</th>
                <th className="font-medium">Method</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2.5">
                    {new Date(r.date).toLocaleDateString('id-ID')}
                  </td>
                  <td>{formatTime(r.clockIn)}</td>
                  <td>{formatTime(r.clockOut)}</td>
                  <td>{r.status}</td>
                  <td>{r.method || '—'}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2.5 text-gray-500 dark:text-gray-400">
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
