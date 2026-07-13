'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  status: string;
  [key: string]: any
}

export function useCandidates() {
  return useQuery({
    queryKey: queryKeys.candidates.all,
    queryFn: () => api.get<Candidate[]>('/recruitment/candidates'),
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Candidate>('/recruitment/candidates', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.candidates.all }); },
  });
}
