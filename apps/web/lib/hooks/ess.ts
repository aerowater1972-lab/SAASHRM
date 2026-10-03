import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getEssDashboard,
  getEssProfile,
  clockIn,
  clockOut,
  getEssAttendance,
  getEssNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getEssLeaveBalances,
  getEssPayslips,
  getEssPayslip,
  acknowledgeEssPayslip,
  getEssPreferences,
  updateEssPreferences,
  getEssOnboardingStatus,
  completeEssTour,
  type ClockPayload,
} from '@/lib/api/ess';

export function useEssDashboard() {
  return useQuery({ queryKey: ['ess', 'dashboard'], queryFn: getEssDashboard });
}

export function useEssProfile() {
  return useQuery({ queryKey: ['ess', 'profile'], queryFn: getEssProfile });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockPayload) => clockIn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['ess', 'attendance'] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockPayload) => clockOut(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['ess', 'attendance'] });
    },
  });
}

export function useEssAttendance(params?: Record<string, unknown>) {
  return useQuery({ queryKey: ['ess', 'attendance', params], queryFn: () => getEssAttendance(params) });
}

export function useEssNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: getEssNotifications,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    },
  });
}

export function useEssLeaveBalances() {
  return useQuery({ queryKey: ['ess', 'leave-balances'], queryFn: getEssLeaveBalances });
}

export function useEssPayslips() {
  return useQuery({ queryKey: ['ess', 'payslips'], queryFn: getEssPayslips });
}

export function useEssPayslip(id: string) {
  return useQuery({ queryKey: ['ess', 'payslips', id], queryFn: () => getEssPayslip(id), enabled: !!id });
}

export function useAcknowledgeEssPayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeEssPayslip(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ess', 'payslips'] }),
  });
}

export function useEssPreferences() {
  return useQuery({ queryKey: ['ess', 'preferences'], queryFn: getEssPreferences });
}

export function useUpdateEssPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => updateEssPreferences(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ess', 'preferences'] }),
  });
}

export function useEssOnboardingStatus() {
  return useQuery({ queryKey: ['ess', 'onboarding'], queryFn: getEssOnboardingStatus });
}

export function useCompleteEssTour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeEssTour(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ess', 'onboarding'] }),
  });
}
