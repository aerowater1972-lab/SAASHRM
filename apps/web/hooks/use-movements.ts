'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface MovementRequest {
  id: string;
  employeeId: string;
  type: string;
  status: string;
  reason?: string;
  effectiveDate: string;
  employee?: any
  newPosition?: any
  newDepartment?: any
  [key: string]: any
}

export function useMovements() {
  return useQuery({
    queryKey: queryKeys.movements.all,
    queryFn: () => api.get<MovementRequest[]>('/employees/movements'),
  });
}

export function useApproveMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/employees/movements/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.movements.all }),
  });
}

export function useRejectMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/employees/movements/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.movements.all }),
  });
}
