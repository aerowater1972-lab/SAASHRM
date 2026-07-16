'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface DashboardData {
  attendance: any
  leaveBalances: any[]
  recentPayslips:any[];
  pendingApprovals: { total: number; leaveRequests: number; corrections: number };
  [key: string]: any
}

export interface AuditEntry {
  id: string; module: string; entity: string; action: string; changedBy: string; changedAt: string;
  [key: string]: any
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => api.get<DashboardData>('/ess/dashboard'),
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'activity'],
    queryFn: async () => {
      const res = await api.get<{ data: AuditEntry[] }>('/admin/audit-logs?limit=10');
      return res.data ?? [];
    },
  });
}
