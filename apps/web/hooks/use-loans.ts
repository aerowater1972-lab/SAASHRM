'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Loan {
  id: string;
  amount: number;
  status: string;
  employee?: any
  createdAt: string;
  [key: string]: any
}

export function useLoans() {
  return useQuery({
    queryKey: queryKeys.loans.all,
    queryFn: () => api.get<Loan[]>('/expense/loans'),
  });
}

export function useApproveLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/expense/loans/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.loans.all }),
  });
}
