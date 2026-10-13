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
  getBradfordScores,
  getFlightRisk,
  getLeaveUtilization,
  getDisengagement,
  getReadiness,
  getExplainDisengagement,
  getDrift,
  getDepartmentHealth,
  getRiskTrend,
  retrainJob,
  notifyHighRisk,
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

export function useBradfordScores(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'bradford', filters], queryFn: () => getBradfordScores(filters) });
}

export function useFlightRisk(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'flight-risk', filters], queryFn: () => getFlightRisk(filters) });
}

export function useLeaveUtilization(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['analytics', 'leave', 'utilization', filters], queryFn: () => getLeaveUtilization(filters) });
}

// --- AI module queries (AI-03: disengagement, AI-04: readiness, AI-06: SHAP, AI-08: drift/retrain) ---

export function useDisengagement(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['ai', 'disengagement', filters], queryFn: () => getDisengagement(filters) });
}

export function useReadiness(filters?: Record<string, unknown>) {
  return useQuery({ queryKey: ['ai', 'readiness', filters], queryFn: () => getReadiness(filters) });
}

export function useExplainDisengagement(employeeId: string) {
  return useQuery({ queryKey: ['ai', 'explain', employeeId], queryFn: () => getExplainDisengagement(employeeId) });
}

export function useDrift() {
  return useQuery({ queryKey: ['ai', 'drift'], queryFn: () => getDrift() });
}

export function useDepartmentHealth() {
  return useQuery({ queryKey: ['ai', 'department-health'], queryFn: () => getDepartmentHealth() });
}

export function useRiskTrend(months?: number) {
  return useQuery({ queryKey: ['ai', 'risk-trend', months ?? 6], queryFn: () => getRiskTrend(months) });
}

export function useRetrainJob() {
  return useMutation({ mutationFn: (data: Record<string, unknown>) => retrainJob(data) });
}

export function useNotifyHighRisk() {
  return useMutation({ mutationFn: () => notifyHighRisk() });
}
