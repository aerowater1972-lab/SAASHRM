import { api } from '@/lib/api';

export async function getHeadcount(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/headcount', { params: filters });
}

export async function getHeadcountTrend(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/headcount/trend', { params: filters });
}

export async function getAttendanceSummary(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/attendance', { params: filters });
}

export async function getAttendanceByDepartment(departmentId: string, filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(`/analytics/attendance/department/${departmentId}`, { params: filters });
}

export async function getLeaveSummary(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/leave', { params: filters });
}

export async function getPayrollSummary(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/payroll', { params: filters });
}

export async function getPayrollByComponent(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/payroll/component', { params: filters });
}

export async function getRecruitmentFunnel(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/recruitment', { params: filters });
}

export async function getTimeToHire(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/recruitment/time-to-hire', { params: filters });
}

export async function getPerformanceDistribution(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/performance', { params: filters });
}

export async function getTurnoverRate(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/turnover', { params: filters });
}

export async function getWorkforceCost(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/workforce-cost', { params: filters });
}

export async function exportReport(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/analytics/export', data);
}

export async function getDashboardSummary(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/dashboard/summary', { params: filters });
}

export async function getBradfordScores(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/bradford', { params: filters });
}

export async function getFlightRisk(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/flight-risk', { params: filters });
}

export async function getLeaveUtilization(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/analytics/leave/utilization', { params: filters });
}

// --- AI module endpoints (AI-03: disengagement, AI-04: readiness, AI-06: SHAP, AI-08: drift/retrain) ---

export async function getDisengagement(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ai/disengagement', { params: filters });
}

export async function getReadiness(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ai/readiness', { params: filters });
}

export async function getExplainDisengagement(employeeId: string, filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(`/ai/explain/${employeeId}`, { params: filters });
}

export async function getDrift(filters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/ai/drift', { params: filters });
}

// --- AI-05: department health score + risk trend ---
export async function getDepartmentHealth(): Promise<any[]> {
  return api.get<any[]>('/ai/department-health');
}

export async function getRiskTrend(months?: number): Promise<any[]> {
  return api.get<any[]>('/ai/risk-trend', { params: months ? { months } : {} });
}

export async function notifyHighRisk(): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/ai/notify-high-risk', {});
}

export async function retrainJob(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/ai/retrain', data);
}
