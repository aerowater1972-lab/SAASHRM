'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Training {
  id: string;
  title: string;
  status: string;
  [key: string]: any
}

export interface Certification {
  id: string;
  name: string;
  expiryDate: string;
  [key: string]: any
}

export function useTrainings() {
  return useQuery({
    queryKey: queryKeys.training.all,
    queryFn: () => api.get<Training[]>('/learning/trainings'),
  });
}

export function useCertifications() {
  return useQuery({
    queryKey: queryKeys.certifications.all,
    queryFn: () => api.get<Certification[]>('/learning/certifications'),
  });
}
