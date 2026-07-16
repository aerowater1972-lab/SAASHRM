import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchEmployees,
  fetchEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  activateEmployee,
  deactivateEmployee,
  fetchEmployeeDocuments,
  fetchEmployeeEmployments,
  type EmployeeListParams,
} from '@/lib/api/employees';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/schemas/employee';
import type { Employee, PaginatedResponse } from '@/lib/types/employee';

export function useEmployees(params?: EmployeeListParams) {
  return useQuery({
    queryKey: [...queryKeys.employees.all, params],
    queryFn: () => fetchEmployees(params),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => fetchEmployee(id),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => createEmployee(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateEmployeeInput) => updateEmployee(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}

export function useActivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateEmployee(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
    },
  });
}

export function useDeactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateEmployee(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
    },
  });
}

export function useEmployeeDocuments(id: string) {
  return useQuery({
    queryKey: ['employees', 'documents', id],
    queryFn: () => fetchEmployeeDocuments(id),
    enabled: !!id,
  });
}

export function useEmployeeEmployments(id: string) {
  return useQuery({
    queryKey: ['employees', 'employments', id],
    queryFn: () => fetchEmployeeEmployments(id),
    enabled: !!id,
  });
}
