import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLeaveRequests,
  fetchLeaveRequest,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  fetchLeaveTypes,
  createLeaveType,
  fetchLeaveBalances,
  type LeaveListParams,
} from '@/lib/api/leave';
import type { LeaveRequestInput } from '@/lib/schemas/leave';

export function useLeaveRequests(params?: LeaveListParams) {
  return useQuery({
    queryKey: ['leave-requests', params],
    queryFn: () => fetchLeaveRequests(params),
  });
}

export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: ['leave-requests', id],
    queryFn: () => fetchLeaveRequest(id),
    enabled: !!id,
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LeaveRequestInput) => createLeaveRequest(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveLeaveRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectLeaveRequest(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: fetchLeaveTypes,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createLeaveType(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types'] }),
  });
}

export function useLeaveBalances() {
  return useQuery({
    queryKey: ['leave-balances'],
    queryFn: fetchLeaveBalances,
  });
}
