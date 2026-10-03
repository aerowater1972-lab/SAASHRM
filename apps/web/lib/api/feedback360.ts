import { api } from '@/lib/api';
import type { Feedback360, Feedback360Response, FeedbackResults, Feedback360Summary } from '@/lib/types';
import type { PaginatedResponse } from '@/lib/types';

export interface Feedback360ListParams {
  page?: number;
  limit?: number;
  status?: string;
  employeeId?: string;
}

export async function fetchFeedback360Sessions(params?: Feedback360ListParams): Promise<PaginatedResponse<Feedback360>> {
  return api.get<PaginatedResponse<Feedback360>>('/feedback360', { params: params as Record<string, unknown> });
}

export async function fetchFeedback360Session(id: string): Promise<Feedback360> {
  return api.get<Feedback360>(`/feedback360/${id}`);
}

export async function createFeedback360Session(data: Record<string, unknown>): Promise<Feedback360> {
  return api.post<Feedback360>('/feedback360', data);
}

export async function updateFeedback360Settings(id: string, data: Record<string, unknown>): Promise<Feedback360> {
  return api.put<Feedback360>(`/feedback360/${id}/settings`, data);
}

export async function submitFeedback(id: string, data: Record<string, unknown>): Promise<{ submitted: boolean; status: string }> {
  return api.post<{ submitted: boolean; status: string }>(`/feedback360/${id}/review`, data);
}

export async function reviewFeedback(id: string, data: { score?: number; comment?: string; flagForFollowUp?: boolean }): Promise<Feedback360> {
  return api.put<Feedback360>(`/feedback360/${id}/review`, data);
}

export async function fetchFeedbackResults(id: string): Promise<FeedbackResults> {
  return api.get<FeedbackResults>(`/feedback360/${id}/results`);
}

export async function fetchEmployeeFeedbackSummary(employeeId: string): Promise<Feedback360Summary> {
  return api.get<Feedback360Summary>(`/feedback360/employee/${employeeId}/summary`);
}

export async function deleteFeedback360Session(id: string): Promise<void> {
  return api.delete(`/feedback360/${id}`);
}
