import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchEngagementSurveys,
  fetchEngagementSurvey,
  createEngagementSurvey,
  updateEngagementSurvey,
  deleteEngagementSurvey,
  fetchEngagementSurveyResults,
  submitEngagementSurveyResponse,
  fetchEngagementSurveyActionItems,
  createEngagementSurveyActionItem,
  updateEngagementSurveyActionItem,
  fetchSurveyActionItems,
  fetchMySurveyActionItems,
  fetchSurveyActionItemSummary,
  updateSurveyActionItemProgress,
  deleteSurveyActionItem,
  fetchEnpsTrend,
  type EngagementSurveyListParams,
  type SurveyActionItemListParams,
} from '@/lib/api/engagement-survey';

export function useEngagementSurveys(params?: EngagementSurveyListParams) {
  return useQuery({
    queryKey: queryKeys.engagementSurveys.list(params as Record<string, string>),
    queryFn: () => fetchEngagementSurveys(params),
  });
}

export function useEngagementSurvey(id: string) {
  return useQuery({
    queryKey: queryKeys.engagementSurveys.detail(id),
    queryFn: () => fetchEngagementSurvey(id),
    enabled: !!id,
  });
}

export function useCreateEngagementSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createEngagementSurvey(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.all });
    },
  });
}

export function useUpdateEngagementSurvey(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => updateEngagementSurvey(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.all });
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.detail(id) });
    },
  });
}

export function useDeleteEngagementSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEngagementSurvey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.all });
    },
  });
}

export function useEngagementSurveyResults(id: string) {
  return useQuery({
    queryKey: queryKeys.engagementSurveys.results(id),
    queryFn: () => fetchEngagementSurveyResults(id),
    enabled: !!id,
  });
}

export function useSubmitEngagementSurveyResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => submitEngagementSurveyResponse(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.all });
    },
  });
}

export function useEngagementSurveyActionItems(surveyId: string) {
  return useQuery({
    queryKey: queryKeys.engagementSurveys.actionItems(surveyId),
    queryFn: () => fetchEngagementSurveyActionItems(surveyId),
    enabled: !!surveyId,
  });
}

export function useCreateEngagementSurveyActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: string; data: Record<string, unknown> }) => createEngagementSurveyActionItem(surveyId, data),
    onSuccess: (_data, { surveyId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.actionItems(surveyId) });
    },
  });
}

export function useUpdateEngagementSurveyActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionItemId, data }: { actionItemId: string; data: Record<string, unknown> }) => updateEngagementSurveyActionItem(actionItemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.all });
    },
  });
}

// ——— QW-03: cross-survey action item workspace ———

export function useSurveyActionItems(params?: SurveyActionItemListParams) {
  return useQuery({
    queryKey: queryKeys.engagementSurveys.actionItemsAll(params as Record<string, unknown>),
    queryFn: () => fetchSurveyActionItems(params),
  });
}

export function useMySurveyActionItems() {
  return useQuery({
    queryKey: queryKeys.engagementSurveys.actionItemsMine,
    queryFn: () => fetchMySurveyActionItems(),
  });
}

export function useSurveyActionItemSummary(surveyId?: string) {
  return useQuery({
    queryKey: queryKeys.engagementSurveys.actionItemsSummary(surveyId),
    queryFn: () => fetchSurveyActionItemSummary(surveyId),
  });
}

export function useUpdateSurveyActionItemProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionItemId, progress }: { actionItemId: string; progress: number }) =>
      updateSurveyActionItemProgress(actionItemId, progress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.all });
    },
  });
}

export function useDeleteSurveyActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionItemId: string) => deleteSurveyActionItem(actionItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.engagementSurveys.all });
    },
  });
}

export function useEnpsTrend(periodMonths?: number) {
  return useQuery({
    queryKey: [...queryKeys.engagementSurveys.enpsTrend, periodMonths],
    queryFn: () => fetchEnpsTrend(periodMonths),
  });
}
