'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface ExpenseClaim {
  id: string;
  title: string;
  amount: number;
  status: string;
  employee?: any;
  createdAt: string;
  [key: string]: any
}

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses.all,
    queryFn: () => api.get<ExpenseClaim[]>('/expense/claims'),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Record<string, any>>('/expense/claims', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.expenses.all }),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/expense/claims/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.expenses.all }),
  });
}
