import { api } from '@/lib/api';
import type { EngagementSurvey, SurveyResults, EnpsTrend, SurveyActionItem, PaginatedResponse } from '@/lib/types';

export interface EngagementSurveyListParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchEngagementSurveys(params?: EngagementSurveyListParams): Promise<PaginatedResponse<EngagementSurvey>> {
  return api.get<PaginatedResponse<EngagementSurvey>>('/engagement-surveys', { params: params as Record<string, unknown> });
}

export async function fetchEngagementSurvey(id: string): Promise<EngagementSurvey> {
  return api.get<EngagementSurvey>(`/engagement-surveys/${id}`);
}

export async function createEngagementSurvey(data: Record<string, unknown>): Promise<EngagementSurvey> {
  return api.post<EngagementSurvey>('/engagement-surveys', data);
}

export async function updateEngagementSurvey(id: string, data: Record<string, unknown>): Promise<EngagementSurvey> {
  return api.put<EngagementSurvey>(`/engagement-surveys/${id}`, data);
}

export async function deleteEngagementSurvey(id: string): Promise<void> {
  return api.delete(`/engagement-surveys/${id}`);
}

export async function fetchEngagementSurveyResults(id: string): Promise<SurveyResults> {
  return api.get<SurveyResults>(`/engagement-surveys/${id}/results`);
}

export async function submitEngagementSurveyResponse(id: string, data: Record<string, unknown>): Promise<void> {
  return api.post(`/engagement-surveys/${id}/submit`, data);
}

export async function fetchEngagementSurveyActionItems(surveyId: string): Promise<SurveyActionItem[]> {
  return api.get<SurveyActionItem[]>(`/engagement-surveys/${surveyId}/action-items`);
}

export async function createEngagementSurveyActionItem(surveyId: string, data: Record<string, unknown>): Promise<SurveyActionItem> {
  return api.post<SurveyActionItem>(`/engagement-surveys/${surveyId}/action-items`, data);
}

export async function updateEngagementSurveyActionItem(actionItemId: string, data: Record<string, unknown>): Promise<SurveyActionItem> {
  return api.put<SurveyActionItem>(`/engagement-surveys/action-items/${actionItemId}`, data);
}

export async function fetchEnpsTrend(periodMonths?: number): Promise<EnpsTrend[]> {
  const params = periodMonths ? { periodMonths: String(periodMonths) } : undefined;
  return api.get<EnpsTrend[]>('/engagement-surveys/enps-trend', { params });
}
