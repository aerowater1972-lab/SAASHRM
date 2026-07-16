import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTodayStatus,
  fetchAttendanceRecords,
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
