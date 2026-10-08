import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTodayStatus,
  fetchAttendanceRecords,
  fetchFlaggedAttendance,
  reviewSpoofRecord,
  clockIn,
  clockOut,
  fetchShifts,
  createShift,
  updateShift,
  deleteShift,
  fetchOvertimeRequests,
  createOvertime,
  approveOvertime,
  rejectOvertime,
  retroactiveApproveOvertime,
  fetchOvertimeRecords,
  fetchRosters,
  createRoster,
  fetchRoster,
  addRosterEntries,
  type AttendanceListParams,
} from '@/lib/api/attendance';
import type { ClockInInput, ClockOutInput } from '@/lib/schemas/attendance';
import { getTenantId } from '@/lib/api';
import {
  IndexedDbClockStore,
  OfflineQueuedError,
  enqueueClock,
  flushOutbox,
  isNetworkError,
  pendingCount,
  type ClockKind,
} from '@/lib/utils/clock-outbox';

const clockStore = new IndexedDbClockStore();

/** POST clock, or persist to the offline outbox when the network is down. */
async function clockWithOfflineFallback<T>(
  kind: ClockKind,
  data: Record<string, unknown>,
  post: (d: any) => Promise<T>,
): Promise<T> {
  try {
    return await post(data);
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    let tenant = 'default';
    try {
      tenant = getTenantId();
    } catch {
      /* SSR-safe fallback */
    }
    const entry = await enqueueClock(clockStore, kind, data, tenant);
    void registerClockSync();
    throw new OfflineQueuedError(entry.id);
  }
}

/** Flush queued clocks (online event, app boot, SW sync message). */
export async function flushPendingClocks(
  post: (kind: ClockKind, payload: Record<string, unknown>) => Promise<unknown>,
): Promise<{ sent: number; dropped: number; remaining: number }> {
  return flushOutbox(clockStore, post);
}

export async function getPendingClockCount(): Promise<number> {
  return pendingCount(clockStore);
}

async function registerClockSync(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sync = (reg as unknown as { sync?: { register: (t: string) => Promise<void> } }).sync;
      if (sync) await sync.register('clock-outbox');
    }
  } catch {
    /* Background Sync unsupported — online-event flush covers it */
  }
}

export function useTodayStatus() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: fetchTodayStatus,
    refetchInterval: 60_000,
  });
}

export function useAttendanceRecords(params?: AttendanceListParams) {
  return useQuery({
    queryKey: ['attendance', 'records', params],
    queryFn: () => fetchAttendanceRecords(params),
  });
}

export function useFlaggedAttendance(reviewed?: 'true' | 'false') {
  return useQuery({
    queryKey: ['attendance', 'flagged', reviewed ?? 'all'],
    queryFn: () => fetchFlaggedAttendance(reviewed),
  });
}

export function useReviewSpoof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => reviewSpoofRecord(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'flagged'] }),
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockInInput) => clockWithOfflineFallback('clock-in', data as Record<string, unknown>, clockIn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockOutInput) => clockWithOfflineFallback('clock-out', data as Record<string, unknown>, clockOut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useShifts() {
  return useQuery({
    queryKey: ['attendance', 'shifts'],
    queryFn: fetchShifts,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createShift(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'shifts'] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => updateShift(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteShift(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) });
}

export function useOvertimeRequests() {
  return useQuery({
    queryKey: ['attendance', 'overtime'],
    queryFn: fetchOvertimeRequests,
  });
}

export function useCreateOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createOvertime(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'overtime'] }),
  });
}

export function useApproveOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveOvertime(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'overtime'] }),
  });
}

export function useRejectOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectOvertime(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'overtime'] }),
  });
}

export function useRetroactiveApproveOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => retroactiveApproveOvertime(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'overtime'] }),
  });
}

export function useOvertimeRecords(params?: { employeeId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['attendance', 'overtime', 'records', params],
    queryFn: () => fetchOvertimeRecords(params),
  });
}

export function useRosters() {
  return useQuery({
    queryKey: ['attendance', 'rosters'],
    queryFn: fetchRosters,
  });
}

export function useCreateRoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; startDate: string; endDate: string }) => createRoster(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'rosters'] }),
  });
}

export function useRoster(id: string | null) {
  return useQuery({
    queryKey: ['attendance', 'rosters', id],
    queryFn: () => fetchRoster(id!),
    enabled: !!id,
  });
}

export function useAddRosterEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rosterId, entries }: { rosterId: string; entries: Array<{ employeeId: string; shiftId: string; date: string }> }) =>
      addRosterEntries(rosterId, entries),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['attendance', 'rosters', v.rosterId] }),
  });
}
