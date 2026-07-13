'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface AttendanceRecord {
  id: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: string;
  [key: string]: any
}

export function useAttendance() {
  return useQuery({
    queryKey: queryKeys.attendance.all,
    queryFn: () => api.get<AttendanceRecord[]>('/attendance/records'),
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Record<string, any>>('/attendance/clock-in', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.attendance.all }),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Record<string, any>>('/attendance/clock-out', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.attendance.all }),
  });
}
