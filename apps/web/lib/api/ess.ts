import { api } from '@/lib/api';

export async function getEssDashboard(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/dashboard');
}

export async function getEssProfile(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/profile');
}

export interface ClockPayload {
  method?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  clientTimestamp?: string;
  embedding?: number[];
  photo?: string;
}

export async function clockIn(data: ClockPayload): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/ess/clock-in', data);
}

export async function clockOut(data: ClockPayload): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/ess/clock-out', data);
}

export async function getEssAttendance(params?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/attendance', { params });
}

export async function getEssNotifications(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/notifications');
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/ess/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/ess/notifications/read-all');
}

export async function getEssLeaveBalances(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/leave-balances');
}

export async function getEssPayslips(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/payslips');
}

export async function getEssPayslip(id: string): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(`/ess/payslips/${id}`);
}

export async function acknowledgeEssPayslip(id: string): Promise<void> {
  await api.post(`/ess/payslips/${id}/acknowledge`);
}

export async function getEssPreferences(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/preferences');
}

export async function updateEssPreferences(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.put<Record<string, unknown>>('/ess/preferences', data);
}

export async function getEssOnboardingStatus(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ess/onboarding');
}

export async function completeEssTour(): Promise<void> {
  await api.post('/ess/onboarding/complete-tour');
}
