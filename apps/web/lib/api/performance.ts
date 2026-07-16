import { api } from '@/lib/api';
import type { Goal, PerformanceReview as Review, ReviewCycle } from '@/lib/types';

async function paginated<T>(url: string, params?: any): Promise<{ data: T[]; total: number }> {
  const res: any = await api.get(url, { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchGoals(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Goal[]; total: number }> {
  return paginated<Goal>('/performance/goals', params);
}

export async function fetchGoal(id: string): Promise<Goal> {
  return api.get(`/performance/goals/${id}`);
}

export async function fetchReviews(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Review[]; total: number }> {
  return paginated<Review>('/reviews', params);
}

export async function fetchReview(id: string): Promise<Review> {
  return api.get(`/reviews/${id}`);
}

export async function fetchCycles(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: ReviewCycle[]; total: number }> {
  return paginated<ReviewCycle>('/performance/cycles', params);
}

export async function fetchCycle(id: string): Promise<ReviewCycle> {
  return api.get(`/performance/cycles/${id}`);
}

export async function updateGoalProgress(id: string, actualValue: number): Promise<void> {
  return api.put(`/performance/goals/${id}/progress`, { actualValue });
}

export async function updateReview(id: string, data: any): Promise<any> {
  return api.put(`/performance/reviews/${id}`, data);
}

export async function submitReview(id: string): Promise<void> {
  return api.post(`/performance/reviews/${id}/submit`, {});
}

export async function startCycle(id: string): Promise<void> {
  return api.post(`/performance/cycles/${id}/start`, {});
}

export async function completeCycle(id: string): Promise<void> {
  return api.post(`/performance/cycles/${id}/complete`, {});
}
