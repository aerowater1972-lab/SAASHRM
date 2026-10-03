import { api } from '@/lib/api';
import type { ManpowerPlan, PlanVsActualItem, CompilationDashboardItem, PaginatedResponse } from '@/lib/types';

export interface ManpowerPlanListParams {
  page?: number;
  limit?: number;
  departmentId?: string;
  period?: string;
  status?: string;
}

export async function fetchManpowerPlans(params?: ManpowerPlanListParams): Promise<PaginatedResponse<ManpowerPlan>> {
  return api.get<PaginatedResponse<ManpowerPlan>>('/manpower-plans', { params: params as Record<string, unknown> });
}

export async function fetchManpowerPlan(id: string): Promise<ManpowerPlan> {
  return api.get<ManpowerPlan>(`/manpower-plans/${id}`);
}

export async function createManpowerPlan(data: Record<string, unknown>): Promise<ManpowerPlan> {
  return api.post<ManpowerPlan>('/manpower-plans', data);
}

export async function updateManpowerPlan(id: string, data: Record<string, unknown>): Promise<ManpowerPlan> {
  return api.put<ManpowerPlan>(`/manpower-plans/${id}`, data);
}

export async function deleteManpowerPlan(id: string): Promise<void> {
  return api.delete(`/manpower-plans/${id}`);
}

export async function submitManpowerPlan(id: string): Promise<ManpowerPlan> {
  return api.post<ManpowerPlan>(`/manpower-plans/${id}/submit`, {});
}

export async function approveManpowerPlan(id: string, data: Record<string, unknown>): Promise<ManpowerPlan> {
  return api.post<ManpowerPlan>(`/manpower-plans/${id}/approve`, data);
}

export async function linkRequisitionToPlan(planId: string, data: Record<string, unknown>): Promise<ManpowerPlan> {
  return api.post<ManpowerPlan>(`/manpower-plans/${planId}/link-requisition`, data);
}

export async function fetchPlanVsActual(params?: ManpowerPlanListParams): Promise<PaginatedResponse<PlanVsActualItem>> {
  return api.get<PaginatedResponse<PlanVsActualItem>>('/manpower-plans/plan-vs-actual', { params: params as Record<string, unknown> });
}

export async function fetchCompilation(period?: string): Promise<CompilationDashboardItem[]> {
  return api.get<CompilationDashboardItem[]>('/manpower-plans/compilation', { params: period ? { period } : {} });
}
