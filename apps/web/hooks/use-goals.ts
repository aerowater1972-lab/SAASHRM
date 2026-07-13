'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Goal {
  id: string;
  title: string;
  status: string;
  targetValue?: number;
  [key: string]: any
}

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.performance.goals,
    queryFn: () => api.get<Goal[]>('/performance/goals'),
  });
}
