'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Application {
  id: string;
  status: string;
  candidate: any
  job?: any
  jobPosting: any
  expectedSalary?: number;
  appliedAt: string;
  [key: string]: any;
}

export function useApplications() {
  return useQuery({
    queryKey: queryKeys.applications.all,
    queryFn: () => api.get<Application[]>('/recruitment/applications'),
  });
}
