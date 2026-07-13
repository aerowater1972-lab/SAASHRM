'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Profile {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  employments?:any[];
  [key: string]: any
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.all,
    queryFn: () => api.get<Profile>('/ess/profile'),
  });
}
