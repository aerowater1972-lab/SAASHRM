'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface JobRequisition {
  id: string;
  title: string;
  department?: any
  headcount: number;
  status: string;
  priority: string;
  createdAt?: string;
  [key: string]: any
}

export function useRequisitions() {
  return useQuery({
    queryKey: queryKeys.requisitions.all,
    queryFn: () => api.get<JobRequisition[]>('/recruitment/requisitions'),
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<JobRequisition>('/recruitment/requisitions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.requisitions.all }),
  });
}

export function useUpdateRequisitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put<Record<string, any>>(`/recruitment/requisitions/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.requisitions.all }),
  });
}
