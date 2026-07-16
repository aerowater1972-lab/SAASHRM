import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getHeadcount,
  getHeadcountTrend,
  getAttendanceSummary,
  getAttendanceByDepartment,
  getLeaveSummary,
  getPayrollSummary,
  getPayrollByComponent,
  getRecruitmentFunnel,
  getTimeToHire,
  getPerformanceDistribution,
  getTurnoverRate,
  getWorkforceCost,
  exportReport,
  getDashboardSummary,
} from '@/lib/api/analytics';

export function useHeadcount(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'headcount', filters], queryFn: () => getHeadcount(filters) });
}

export function useHeadcountTrend(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'headcount-trend', filters], queryFn: () => getHeadcountTrend(filters) });
}

export function useAttendanceSummary(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'attendance', filters], queryFn: () => getAttendanceSummary(filters) });
}

export function useAttendanceByDepartment(departmentId: string, filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['analytics', 'attendance', 'department', departmentId, filters],
    queryFn: () => getAttendanceByDepartment(departmentId, filters),
    enabled: !!departmentId,
  });
}

export function useLeaveSummary(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'leave', filters], queryFn: () => getLeaveSummary(filters) });
}

export function usePayrollSummary(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'payroll', filters], queryFn: () => getPayrollSummary(filters) });
}

export function usePayrollByComponent(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'payroll-component', filters], queryFn: () => getPayrollByComponent(filters) });
}

export function useRecruitmentFunnel(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'recruitment', filters], queryFn: () => getRecruitmentFunnel(filters) });
}

export function useTimeToHire(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'time-to-hire', filters], queryFn: () => getTimeToHire(filters) });
}

export function usePerformanceDistribution(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'performance', filters], queryFn: () => getPerformanceDistribution(filters) });
}

export function useTurnoverRate(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'turnover', filters], queryFn: () => getTurnoverRate(filters) });
}

export function useWorkforceCost(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'workforce-cost', filters], queryFn: () => getWorkforceCost(filters) });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => exportReport(data),
  });
}

export function useDashboardSummary(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'dashboard', 'summary', filters], queryFn: () => getDashboardSummary(filters) });
}
