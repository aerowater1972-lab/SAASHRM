import { api } from '@/lib/api';
import type { Employee, PaginatedResponse } from '@/lib/types/employee';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/schemas/employee';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  departmentId?: string;
  positionId?: string;
  gradeId?: string;
  includePending?: boolean;
}

export async function fetchEmployees(params?: EmployeeListParams): Promise<PaginatedResponse<Employee>> {
  const res = await api.get<any>('/employees', { params: params as Record<string, unknown> });
  // Backend returns { data, total, page, pageSize } OR a plain array.
  if (Array.isArray(res)) {
    return { data: res, meta: { total: res.length, page: 1, limit: res.length, totalPages: 1 } };
  }
  const total = res.total ?? res.meta?.total ?? res.data?.length ?? 0;
  const page = res.page ?? res.meta?.page ?? 1;
  const limit = res.pageSize ?? res.meta?.limit ?? res.data?.length ?? 20;
  return {
    data: res.data ?? [],
    meta: {
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    },
  };
}

export async function fetchEmployee(id: string): Promise<Employee> {
  return api.get<Employee>(`/employees/${id}`);
}

export async function createEmployee(data: CreateEmployeeInput): Promise<Employee> {
  return api.post<Employee>('/employees', data);
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput): Promise<Employee> {
  return api.put<Employee>(`/employees/${id}`, data);
}

export async function deleteEmployee(id: string): Promise<void> {
  return api.delete<Record<string, unknown>>(`/employees/${id}`) as unknown as Promise<void>;
}

export async function activateEmployee(id: string): Promise<Employee> {
  return api.post<Employee>(`/employees/${id}/activate`);
}

export async function deactivateEmployee(id: string): Promise<Employee> {
  return api.post<Employee>(`/employees/${id}/deactivate`);
}

export async function fetchEmployeeDocuments(id: string): Promise<any[]> {
  return api.get<any[]>(`/employees/${id}/documents`);
}

export async function fetchEmployeeEmployments(id: string): Promise<any[]> {
  return api.get<any[]>(`/employees/${id}/employments`);
}

export async function bulkImportEmployees(data: CreateEmployeeInput[]): Promise<Employee[]> {
  return api.post<Employee[]>('/employees/bulk-import', data);
}
