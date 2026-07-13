'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Cycle {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  [key: string]: any
}

export function useCycles() {
  return useQuery({
    queryKey: queryKeys.performance.cycles,
    queryFn: () => api.get<Cycle[]>('/performance/cycles'),
  });
}
