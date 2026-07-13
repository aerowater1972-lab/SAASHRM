'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface LeaveRequest {
  id: string;
  leaveType: any
  startDate: string;
  endDate: string;
  status: string;
  employee?: any
  [key: string]: any
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: queryKeys.leaveRequests.all,
    queryFn: () => api.get<LeaveRequest[]>('/attendance/leave-requests'),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/attendance/leave-requests/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all }),
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/attendance/leave-requests/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all }),
  });
}
