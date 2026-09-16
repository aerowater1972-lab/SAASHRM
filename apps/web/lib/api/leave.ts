import { api } from '@/lib/api';
import type { LeaveRequest, LeaveType, LeaveBalance, PaginatedResponse } from '@/lib/types';
import type { LeaveRequestInput, LeaveTypeInput } from '@/lib/schemas/leave';

export interface LeaveListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchLeaveRequests(params?: LeaveListParams): Promise<PaginatedResponse<LeaveRequest>> {
  return api.get<PaginatedResponse<LeaveRequest>>('/attendance/leave-requests', { params: params as Record<string, unknown> });
}

export async function fetchLeaveRequest(id: string): Promise<LeaveRequest> {
  return api.get<LeaveRequest>(`/attendance/leave-requests/${id}`);
}

export async function createLeaveRequest(data: LeaveRequestInput): Promise<LeaveRequest> {
  return api.post<LeaveRequest>('/attendance/leave-requests', data);
}

export async function approveLeaveRequest(id: string): Promise<LeaveRequest> {
  return api.put<LeaveRequest>(`/attendance/leave-requests/${id}/approve`);
}

export async function rejectLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
  return api.put<LeaveRequest>(`/attendance/leave-requests/${id}/reject`, { reason });
}

export async function cancelLeaveRequest(id: string): Promise<void> {
  return api.put(`/attendance/leave-requests/${id}`, {});
}

export async function escalateLeaveRequest(id: string): Promise<LeaveRequest> {
  return api.post<LeaveRequest>(`/attendance/leave-requests/${id}/escalate`, {});
}

export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  return api.get<LeaveType[]>('/attendance/leave-types');
}

export async function createLeaveType(data: LeaveTypeInput): Promise<LeaveType> {
  return api.post<LeaveType>('/attendance/leave-types', data);
}

export async function updateLeaveType(id: string, data: Partial<LeaveTypeInput>): Promise<LeaveType> {
  return api.put<LeaveType>(`/attendance/leave-types/${id}`, data);
}

export async function fetchLeaveBalances(): Promise<LeaveBalance[]> {
  return api.get<LeaveBalance[]>('/attendance/balances');
}
