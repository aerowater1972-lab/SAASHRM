import { api } from '@/lib/api';
import type { AttendanceRecord, Shift, OvertimeRequest, PaginatedResponse } from '@/lib/types';
import type { ClockInInput, ClockOutInput } from '@/lib/schemas/attendance';

export interface TodayStatus {
  record: AttendanceRecord | null;
  shift?: any;
  isClockedIn: boolean;
  isClockedOut: boolean;
  currentTime: string;
}

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchTodayStatus(): Promise<TodayStatus> {
  return api.get<TodayStatus>('/attendance/today');
}

export async function fetchAttendanceRecords(params?: AttendanceListParams): Promise<PaginatedResponse<AttendanceRecord>> {
  return api.get<PaginatedResponse<AttendanceRecord>>('/attendance/records', { params: params as Record<string, unknown> });
}

export async function clockIn(data: ClockInInput): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>('/attendance/clock-in', data);
}

export async function clockOut(data: ClockOutInput): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>('/attendance/clock-out', data);
}

export async function fetchShifts(): Promise<Shift[]> {
  return api.get<Shift[]>('/attendance/shifts');
}

export async function createShift(data: any): Promise<Shift> {
  return api.post<Shift>('/attendance/shifts', data);
}

export async function updateShift(id: string, data: any): Promise<any> {
  return api.put(`/attendance/shifts/${id}`, data);
}

export async function deleteShift(id: string): Promise<void> {
  return api.delete(`/attendance/shifts/${id}`);
}

export async function fetchOvertimeRequests(): Promise<OvertimeRequest[]> {
  return api.get<OvertimeRequest[]>('/attendance/overtime/requests');
}

export async function createOvertime(data: any): Promise<OvertimeRequest> {
  return api.post<OvertimeRequest>('/attendance/overtime/requests', data);
}

export async function approveOvertime(id: string): Promise<OvertimeRequest> {
  return api.post<OvertimeRequest>(`/attendance/overtime/requests/${id}/approve`);
}

export async function rejectOvertime(id: string, reason?: string): Promise<OvertimeRequest> {
  return api.post<OvertimeRequest>(`/attendance/overtime/requests/${id}/reject`, { reason });
}

export async function retroactiveApproveOvertime(id: string, reason: string): Promise<OvertimeRequest> {
  return api.post<OvertimeRequest>(`/attendance/overtime/requests/${id}/retroactive-approve`, { reason });
}

export interface OvertimeRecord {
  id: string;
  employeeId: string;
  overtimeRequestId?: string | null;
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  payableMinutes: number;
  dayType: 'HARI_KERJA' | 'ISTIRAHAT_MINGGUAN' | 'HARI_LIBUR_RESM';
  isRetroactive: boolean;
  isPaid: boolean;
}

export async function fetchOvertimeRecords(params?: { employeeId?: string; startDate?: string; endDate?: string }): Promise<OvertimeRecord[]> {
  return api.get<OvertimeRecord[]>('/attendance/overtime', { params: params as Record<string, unknown> });
}
