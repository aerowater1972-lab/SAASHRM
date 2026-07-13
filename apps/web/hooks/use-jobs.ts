'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface JobPosting {
  id: string;
  title: string;
  status: string;
  department?: any
  [key: string]: any
}

export function useJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.all,
    queryFn: () => api.get<JobPosting[]>('/recruitment/jobs'),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<JobPosting>('/recruitment/jobs', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.jobs.all }); },
  });
}
