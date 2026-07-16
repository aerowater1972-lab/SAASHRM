import { api } from '@/lib/api';
import type { Department, Position, Grade, OrganizationEntity, OrgChartNode } from '@/lib/types/employee';
import type { CreateDepartmentInput, CreatePositionInput, CreateGradeInput } from '@/lib/schemas/organization';

export async function fetchDepartments(): Promise<Department[]> {
  return api.get<Department[]>('/departments');
}

export async function fetchDepartment(id: string): Promise<Department> {
  return api.get<Department>(`/departments/${id}`);
}

export async function createDepartment(data: CreateDepartmentInput): Promise<Department> {
  return api.post<Department>('/departments', data);
}

export async function updateDepartment(id: string, data: Partial<CreateDepartmentInput>): Promise<Department> {
  return api.put<Department>(`/departments/${id}`, data);
}

export async function fetchPositions(): Promise<Position[]> {
  return api.get<Position[]>('/positions');
}

export async function createPosition(data: CreatePositionInput): Promise<Position> {
  return api.post<Position>('/positions', data);
}

export async function updatePosition(id: string, data: Partial<CreatePositionInput>): Promise<Position> {
  return api.put<Position>(`/positions/${id}`, data);
}

export async function fetchGrades(): Promise<Grade[]> {
  return api.get<Grade[]>('/grades');
}

export async function createGrade(data: CreateGradeInput): Promise<Grade> {
  return api.post<Grade>('/grades', data);
}

export async function fetchOrganizationTree(): Promise<OrganizationEntity[]> {
  return api.get<OrganizationEntity[]>('/organizations');
}

export async function fetchOrgChart(effectiveDate?: string): Promise<OrgChartNode> {
  return api.get<OrgChartNode>('/org-chart', { params: { effectiveDate } as Record<string, unknown> });
}
