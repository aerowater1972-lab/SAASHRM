import { api } from '@/lib/api';
import type { EngagementSurvey, SurveyResults, EnpsTrend, SurveyActionItem, SurveyActionItemSummary, SurveyActionItemListParams, PaginatedResponse } from '@/lib/types';

export type { SurveyActionItemListParams };

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

/** QW-03: cross-survey action item list (HR view / "my items"). */
export async function fetchSurveyActionItems(params?: SurveyActionItemListParams): Promise<{
  data: SurveyActionItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  return api.get<{ data: SurveyActionItem[]; total: number; page: number; pageSize: number }>(
    '/engagement-surveys/action-items',
    { params: params as Record<string, unknown> },
  );
}

/** QW-03: action items assigned to the signed-in user. */
export async function fetchMySurveyActionItems(status?: string): Promise<SurveyActionItem[]> {
  const params = status ? { status } : undefined;
  return api.get<SurveyActionItem[]>('/engagement-surveys/action-items/my', { params });
}

/** QW-03: aggregated action item progress summary. */
export async function fetchSurveyActionItemSummary(surveyId?: string): Promise<SurveyActionItemSummary> {
  const params = surveyId ? { surveyId } : undefined;
  return api.get<SurveyActionItemSummary>('/engagement-surveys/action-items/summary', { params });
}

/** QW-03: owner updates progress (0-100); 100 auto-completes. */
export async function updateSurveyActionItemProgress(actionItemId: string, progress: number): Promise<SurveyActionItem> {
  return api.patch<SurveyActionItem>(`/engagement-surveys/action-items/${actionItemId}/progress`, { progress });
}

/** QW-03: soft-delete an action item. */
export async function deleteSurveyActionItem(actionItemId: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/engagement-surveys/action-items/${actionItemId}`);
}

export async function fetchEnpsTrend(periodMonths?: number): Promise<EnpsTrend[]> {
  const params = periodMonths ? { periodMonths: String(periodMonths) } : undefined;
  return api.get<EnpsTrend[]>('/engagement-surveys/enps-trend', { params });
}
