import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import * as feedback360Api from '@/lib/api/feedback360';
import type { Feedback360, FeedbackResults, Feedback360Summary, PaginatedResponse } from '@/lib/types';

export function useFeedback360Sessions() {
  return useQuery<PaginatedResponse<Feedback360>, Error>({
    queryKey: queryKeys.feedback360.all,
    queryFn: () => feedback360Api.fetchFeedback360Sessions(),
  });
}

export function useFeedback360Session(id: string) {
  return useQuery<Feedback360>({
    queryKey: queryKeys.feedback360.detail(id),
    queryFn: () => feedback360Api.fetchFeedback360Session(id),
    enabled: !!id,
  });
}

export function useCreateFeedback360Session() {
  const queryClient = useQueryClient();
  return useMutation<Feedback360, Error, Record<string, unknown>>({
    mutationFn: feedback360Api.createFeedback360Session,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback360.all });
    },
  });
}

export function useUpdateFeedback360Settings() {
  const queryClient = useQueryClient();
  return useMutation<Feedback360, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => feedback360Api.updateFeedback360Settings(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback360.detail(variables.id) });
    },
  });
}

export function useSubmitFeedback() {
  return useMutation<{ submitted: boolean; status: string }, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => feedback360Api.submitFeedback(id, data),
  });
}

export function useReviewFeedback() {
  const queryClient = useQueryClient();
  return useMutation<Feedback360, Error, { id: string; data: { score?: number; comment?: string; flagForFollowUp?: boolean } }>({
    mutationFn: ({ id, data }) => feedback360Api.reviewFeedback(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback360.detail(variables.id) });
    },
  });
}

export function useFeedbackResults(id: string) {
  return useQuery<FeedbackResults>({
    queryKey: queryKeys.feedback360.results(id),
    queryFn: () => feedback360Api.fetchFeedbackResults(id),
    enabled: !!id,
  });
}

export function useEmployeeFeedbackSummary(employeeId: string) {
  return useQuery<Feedback360Summary>({
    queryKey: queryKeys.feedback360.employeeSummary(employeeId),
    queryFn: () => feedback360Api.fetchEmployeeFeedbackSummary(employeeId),
    enabled: !!employeeId,
  });
}

export function useDeleteFeedback360Session() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: feedback360Api.deleteFeedback360Session,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback360.all });
    },
  });
}