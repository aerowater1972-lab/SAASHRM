import { api } from '@/lib/api';
import type { Employee, PaginatedResponse } from '@/lib/types/employee';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/schemas/employee';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  departmentId?: string;
  gradeId?: string;
  includePending?: boolean;
}

export async function fetchEmployees(params?: EmployeeListParams): Promise<PaginatedResponse<Employee>> {
  return api.get<PaginatedResponse<Employee>>('/employees', { params: params as Record<string, unknown> });
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
