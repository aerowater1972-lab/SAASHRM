'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Benefit {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  amount?: number;
  status: string;
  isActive: boolean;
  createdAt: string;
  [key: string]: any;
}

export function useBenefits() {
  return useQuery({
    queryKey: queryKeys.benefits.all,
    queryFn: () => api.get<Benefit[]>('/benefits'),
  });
}
