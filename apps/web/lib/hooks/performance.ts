import { useQuery, useMutation, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchGoals, fetchGoal, createGoal, fetchReviews, fetchReview, fetchCycles, fetchCycle, updateGoalProgress, updateReview, submitReview, startCycle, completeCycle, startPip, fetchPipStatus } from '@/lib/api/performance';

function usePagedList<T>(queryKey: string[], fetcher: (params: any) => Promise<{ data: T[]; total: number }>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const query = useQuery({
    queryKey: [...queryKey, { page, limit, q: search || undefined }],
    queryFn: () => fetcher({ page, limit, q: search || undefined }),
    placeholderData: keepPreviousData,
  });

  return {
    rows: query.data?.data || ([] as T[]),
    total: query.data?.total || 0,
    page, setPage, search,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    isLoading: query.isLoading, error: query.error, refetch: query.refetch,
  };
}

export function useGoals() {
  return usePagedList<any>(['goals'], fetchGoals);
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goals', id],
    queryFn: () => fetchGoal(id),
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createGoal>[0]) => createGoal(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useReviews() {
  return usePagedList<any>(['reviews'], fetchReviews);
}

export function useReview(id: string) {
  return useQuery({
    queryKey: ['reviews', id],
    queryFn: () => fetchReview(id),
    enabled: !!id,
  });
}

export function useCycles() {
  return usePagedList<any>(['cycles'], fetchCycles);
}

export function useCycle(id: string) {
  return useQuery({
    queryKey: ['cycles', id],
    queryFn: () => fetchCycle(id),
    enabled: !!id,
  });
}

export function useUpdateGoalProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actualValue }: { id: string; actualValue: number }) => updateGoalProgress(id, actualValue),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'goals'] }),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateReview(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'reviews'] }),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'reviews'] }),
  });
}

export function useStartCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startCycle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'cycles'] }),
  });
}

export function useCompleteCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeCycle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'cycles'] }),
  });
}

export function usePipStatus(employeeId: string) {
  return useQuery({
    queryKey: ['performance', 'pip', employeeId],
    queryFn: () => fetchPipStatus(employeeId),
    enabled: !!employeeId,
  });
}

export function useStartPip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId, data,
    }: {
      employeeId: string;
      data: { goals: { title: string; metric?: string; targetValue?: number }[]; endDate?: string; reviewId?: string };
    }) => startPip(employeeId, data),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: ['performance', 'pip', variables.employeeId] }),
  });
}
