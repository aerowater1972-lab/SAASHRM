import { api } from '@/lib/api';

// --- Timesheet (attendance x tasks) ---

export interface TimesheetCell {
  entryId: string | null;
  hours: number;
  description: string | null;
  billable: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | null;
}

export interface TimesheetRow {
  taskId: string | null;
  projectId: string | null;
  taskTitle: string;
  projectName: string | null;
  cells: Record<string, TimesheetCell>;
  total: number;
}

export interface WeeklyTimesheet {
  weekStart: string;
  weekEnd: string;
  days: string[];
  rows: TimesheetRow[];
  dayTotals: Record<string, number>;
  grandTotal: number;
  locked: boolean;
}

export interface UpsertTimesheetEntryPayload {
  taskId?: string;
  projectId?: string;
  workDate: string;
  hours: number;
  description?: string;
  billable?: boolean;
}

export function fetchMyWeek(anchor?: string): Promise<WeeklyTimesheet> {
  const qs = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return api.get<WeeklyTimesheet>(`/timesheet/my${qs}`);
}

export function fetchEmployeeWeek(employeeId: string, anchor?: string): Promise<WeeklyTimesheet> {
  const qs = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
  return api.get<WeeklyTimesheet>(`/timesheet/employee/${encodeURIComponent(employeeId)}${qs}`);
}

export function upsertTimesheetEntry(payload: UpsertTimesheetEntryPayload): Promise<any> {
  return api.post('/timesheet/entries', payload);
}

export function deleteTimesheetEntry(entryId: string): Promise<any> {
  return api.delete(`/timesheet/entries/${encodeURIComponent(entryId)}`);
}

export function submitTimesheetWeek(anchor: string): Promise<{ submitted: number }> {
  return api.post('/timesheet/my/submit', { anchor });
}

export function approveTimesheetEntry(entryId: string): Promise<any> {
  return api.post(`/timesheet/entries/${encodeURIComponent(entryId)}/approve`);
}

export function rejectTimesheetEntry(entryId: string): Promise<any> {
  return api.post(`/timesheet/entries/${encodeURIComponent(entryId)}/reject`);
}

export function fetchApprovedSummary(startDate: string, endDate: string): Promise<{ employeeId: string; approvedHours: number }[]> {
  return api.get(`/timesheet/approved-summary?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
}
