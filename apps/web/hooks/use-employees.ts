'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  status: string;
  employments?: any[];
  [key: string]: any
}

export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: () => api.get<Employee[]>('/employees'),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => api.get<Employee>(`/employees/${id}`),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Employee>('/employees', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.employees.all }); },
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put<Employee>(`/employees/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.employees.all }); },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Record<string, any>>(`/employees/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.employees.all }); },
  });
}
