'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Review {
  id: string;
  status: string;
  employee?: any
  [key: string]: any
}

export function useReviews() {
  return useQuery({
    queryKey: queryKeys.performance.reviews,
    queryFn: () => api.get<Review[]>('/performance/reviews'),
  });
}
