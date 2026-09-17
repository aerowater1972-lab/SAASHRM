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
    mutationFn: (data: ClockInInput) => clockIn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockOutInput) => clockOut(data),
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
