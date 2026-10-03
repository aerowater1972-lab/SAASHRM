import { api } from '@/lib/api';
import type { IndividualDevelopmentPlan, IDPActivity } from '@/lib/types';
import type { PaginatedResponse } from '@/lib/types';

export interface IDPListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: string;
}

export async function fetchIDPs(params?: IDPListParams): Promise<PaginatedResponse<IndividualDevelopmentPlan>> {
  return api.get<PaginatedResponse<IndividualDevelopmentPlan>>('/idp', { params: params as Record<string, unknown> });
}

export async function fetchIDP(id: string): Promise<IndividualDevelopmentPlan> {
  return api.get<IndividualDevelopmentPlan>(`/idp/${id}`);
}

export async function createIDP(data: Record<string, unknown>): Promise<IndividualDevelopmentPlan> {
  return api.post<IndividualDevelopmentPlan>('/idp', data);
}

export async function updateIDP(id: string, data: Record<string, unknown>): Promise<IndividualDevelopmentPlan> {
  return api.put<IndividualDevelopmentPlan>(`/idp/${id}`, data);
}

export async function updateIDPStatus(id: string, status: string): Promise<IndividualDevelopmentPlan> {
  return api.put<IndividualDevelopmentPlan>(`/idp/${id}/status`, { status });
}

export async function addIDPActivity(idpId: string, data: Record<string, unknown>): Promise<IDPActivity> {
  return api.post<IDPActivity>(`/idp/${idpId}/activities`, data);
}

export async function updateIDPActivity(idpId: string, activityId: string, data: Record<string, unknown>): Promise<IDPActivity> {
  return api.put<IDPActivity>(`/idp/${idpId}/activities/${activityId}`, data);
}

export async function fetchEmployeeIDPSummary(employeeId: string): Promise<{ employeeId: string; totalPlans: number; activePlans: number; completedPlans: number; totalActivities: number; completedActivities: number; completionRate: number }> {
  return api.get<{ employeeId: string; totalPlans: number; activePlans: number; completedPlans: number; totalActivities: number; completedActivities: number; completionRate: number }>(`/idp/employee/${employeeId}/summary`);
}

export async function deleteIDP(id: string): Promise<void> {
  return api.delete(`/idp/${id}`);
}

export async function fetchTrainingRecommendations(
  employeeId: string,
  limit?: number,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(`/idp/employee/${employeeId}/training-recommendations`, {
    params: (limit ? { limit } : {}) as Record<string, unknown>,
  });
}
