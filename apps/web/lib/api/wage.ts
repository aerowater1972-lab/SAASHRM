import { api } from '@/lib/api';
import type { ProvincialMinimumWage } from '@/lib/types';

export interface WageListParams {
  province?: string;
  year?: number;
}

export async function fetchProvincialWages(params?: WageListParams): Promise<ProvincialMinimumWage[]> {
  return api.get<ProvincialMinimumWage[]>('/wage/provincial', { params: params as Record<string, unknown> });
}

export async function fetchProvincialWage(id: string): Promise<ProvincialMinimumWage> {
  return api.get<ProvincialMinimumWage>(`/wage/provincial/${id}`);
}

export async function createProvincialWage(data: Record<string, unknown>): Promise<ProvincialMinimumWage> {
  return api.post<ProvincialMinimumWage>('/wage/provincial', data);
}

export async function updateProvincialWage(id: string, data: Record<string, unknown>): Promise<ProvincialMinimumWage> {
  return api.put<ProvincialMinimumWage>(`/wage/provincial/${id}`, data);
}

export async function deleteProvincialWage(id: string): Promise<void> {
  return api.delete(`/wage/provincial/${id}`);
}

export async function fetchWageCalculation(employeeId: string, periodYear?: number): Promise<{ employeeId: string; province: string; year: number; minimumWage: number | null; hasProvincialWage: boolean } | null> {
  return api.get<{ employeeId: string; province: string; year: number; minimumWage: number | null; hasProvincialWage: boolean } | null>(`/wage/provincial/calculate`, { params: { employeeId, periodYear } });
}

export async function lookupWage(province: string, year: number): Promise<ProvincialMinimumWage> {
  return api.get<ProvincialMinimumWage>(`/wage/provincial/lookup/${province}/${year}`);
}

export async function fetchWageStats(year?: number): Promise<{ totalEntries: number; uniqueProvinces: number; averageWage: number; yearRange: { min: number | null; max: number | null } }> {
  return api.get<{ totalEntries: number; uniqueProvinces: number; averageWage: number; yearRange: { min: number | null; max: number | null } }>('/wage/provincial/stats', { params: { year } });
}
