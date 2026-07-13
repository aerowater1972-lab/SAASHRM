'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Resignation {
  id: string;
  status: string;
  employee?: any
  reason?: string;
  [key: string]: any
}

export function useResignations() {
  return useQuery({
    queryKey: queryKeys.resignations.all,
    queryFn: () => api.get<Resignation[]>('/resignation/requests'),
  });
}

export function useCreateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Resignation>('/resignation/requests', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.resignations.all }); },
  });
}

export function useApproveResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/resignation/requests/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.resignations.all }); },
  });
}

export function useRejectResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/resignation/requests/${id}/reject`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.resignations.all }); },
  });
}
