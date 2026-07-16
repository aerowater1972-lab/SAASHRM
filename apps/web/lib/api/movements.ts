import { api } from '@/lib/api';
import type { MovementRequest } from '@/lib/types';

export async function fetchMovements(): Promise<MovementRequest[]> {
  const res: any = await api.get('/employees/movements');
  return Array.isArray(res) ? res : (res.data ?? []);
}

export async function createMovement(data: any): Promise<MovementRequest> {
  return api.post('/employees/movements', data);
}

export async function approveMovement(id: string): Promise<MovementRequest> {
  return api.put(`/employees/movements/${id}/approve`, {});
}

export async function rejectMovement(id: string): Promise<MovementRequest> {
  return api.put(`/employees/movements/${id}/reject`, {});
}

export async function fetchDepartments(): Promise<any[]> {
  const res: any = await api.get('/employees/organization/departments');
  return Array.isArray(res) ? res : (res.data ?? []);
}

export async function fetchPositions(): Promise<any[]> {
  const res: any = await api.get('/employees/organization/positions');
  return Array.isArray(res) ? res : (res.data ?? []);
}

export async function fetchEmployees(): Promise<any[]> {
  const res: any = await api.get('/employees');
  return Array.isArray(res) ? res : (res.data ?? []);
}
