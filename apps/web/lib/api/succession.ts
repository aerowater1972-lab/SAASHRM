import { api } from '@/lib/api';

export type TalentPoolStatus = 'ACTIVE' | 'ARCHIVED';
export type TalentReadiness = 'NOT_READY' | 'DEVELOPING' | 'READY_IN_1_2_YEARS' | 'READY_NOW';
export type SuccessionPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface TalentPool {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  criteria: string | null;
  status: TalentPoolStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: { members: number };
}

export interface PoolMember {
  id: string;
  poolId: string;
  employeeId: string;
  performanceBand: string | null;
  potentialBand: string | null;
  readiness: TalentReadiness;
  notes: string | null;
  addedById: string;
  employee?: { id: string; fullName: string; employeeId: string; email: string; profilePicture: string | null } | null;
  addedBy?: { id: string; fullName: string } | null;
}

export interface SuccessionPlan {
  id: string;
  tenantId: string;
  positionId: string;
  departmentId: string | null;
  currentEmployeeId: string | null;
  status: SuccessionPlanStatus;
  riskCode: string | null;
  targetReadyDate: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  position?: { id: string; name: string; code: string | null; grade?: { name: string; level: number } | null } | null;
  department?: { id: string; name: string } | null;
  currentHolder?: { id: string; fullName: string; employeeId: string } | null;
  createdBy?: { id: string; fullName: string; email: string } | null;
  _count?: { candidates: number };
}

export interface SuccessionCandidate {
  id: string;
  planId: string;
  employeeId: string;
  readiness: TalentReadiness;
  rank: number;
  assessmentNotes: string | null;
  decision: string;
  addedById: string;
  employee?: { id: string; fullName: string; employeeId: string; email: string; profilePicture: string | null } | null;
  addedBy?: { id: string; fullName: string } | null;
}

export interface SuccessionSummary {
  totalPlans: number;
  activePlans: number;
  totalPools: number;
  totalCandidates: number;
  riskByCode: { riskCode: string | null; count: number }[];
  readinessDistribution: { readiness: TalentReadiness; count: number }[];
}

export interface TalentPoolListParams {
  search?: string;
  status?: string;
}

export interface SuccessionPlanListParams {
  status?: string;
  departmentId?: string;
  search?: string;
}

export async function fetchSuccessionSummary(): Promise<SuccessionSummary> {
  return api.get<SuccessionSummary>('/succession/summary');
}

export interface NineBoxMatrix {
  poolId: string | null;
  totalMembers: number;
  placed: number;
  unplaced: unknown[];
  boxes: { performance: string; potential: string; count: number; action: string; people: unknown[] }[];
}

export async function fetchNineBoxMatrix(poolId?: string): Promise<NineBoxMatrix> {
  return api.get<NineBoxMatrix>('/succession/nine-box', {
    params: (poolId ? { poolId } : {}) as Record<string, unknown>,
  });
}

export async function fetchTalentPools(params?: TalentPoolListParams): Promise<TalentPool[]> {
  return api.get<TalentPool[]>('/succession/pools', { params: params as Record<string, unknown> });
}

export async function fetchTalentPool(id: string): Promise<TalentPool & { members: PoolMember[] }> {
  return api.get<TalentPool & { members: PoolMember[] }>(`/succession/pools/${id}`);
}

export async function createTalentPool(data: Record<string, unknown>): Promise<TalentPool> {
  return api.post<TalentPool>('/succession/pools', data);
}

export async function updateTalentPool(id: string, data: Record<string, unknown>): Promise<TalentPool> {
  return api.put<TalentPool>(`/succession/pools/${id}`, data);
}

export async function deleteTalentPool(id: string): Promise<void> {
  return api.delete(`/succession/pools/${id}`);
}

export async function addPoolMember(poolId: string, data: Record<string, unknown>): Promise<PoolMember> {
  return api.post<PoolMember>(`/succession/pools/${poolId}/members`, data);
}

export async function updatePoolMember(poolId: string, employeeId: string, data: Record<string, unknown>): Promise<PoolMember> {
  return api.put<PoolMember>(`/succession/pools/${poolId}/members/${employeeId}`, data);
}

export async function removePoolMember(poolId: string, employeeId: string): Promise<void> {
  return api.delete(`/succession/pools/${poolId}/members/${employeeId}`);
}

export async function fetchSuccessionPlans(params?: SuccessionPlanListParams): Promise<SuccessionPlan[]> {
  return api.get<SuccessionPlan[]>('/succession/plans', { params: params as Record<string, unknown> });
}

export async function fetchSuccessionPlan(id: string): Promise<SuccessionPlan & { candidates: SuccessionCandidate[] }> {
  return api.get<SuccessionPlan & { candidates: SuccessionCandidate[] }>(`/succession/plans/${id}`);
}

export async function createSuccessionPlan(data: Record<string, unknown>): Promise<SuccessionPlan> {
  return api.post<SuccessionPlan>('/succession/plans', data);
}

export async function updateSuccessionPlan(id: string, data: Record<string, unknown>): Promise<SuccessionPlan> {
  return api.put<SuccessionPlan>(`/succession/plans/${id}`, data);
}

export async function deleteSuccessionPlan(id: string): Promise<void> {
  return api.delete(`/succession/plans/${id}`);
}

export async function addSuccessionCandidate(planId: string, data: Record<string, unknown>): Promise<SuccessionCandidate> {
  return api.post<SuccessionCandidate>(`/succession/plans/${planId}/candidates`, data);
}

export async function updateSuccessionCandidate(planId: string, candidateId: string, data: Record<string, unknown>): Promise<SuccessionCandidate> {
  return api.put<SuccessionCandidate>(`/succession/plans/${planId}/candidates/${candidateId}`, data);
}

export async function removeSuccessionCandidate(planId: string, candidateId: string): Promise<void> {
  return api.delete(`/succession/plans/${planId}/candidates/${candidateId}`);
}

export const readinessLabels: Record<TalentReadiness, string> = {
  NOT_READY: 'Belum Siap',
  DEVELOPING: 'Sedang Dikembangkan',
  READY_IN_1_2_YEARS: 'Siap 1-2 Tahun',
  READY_NOW: 'Siap Sekarang',
};

export const readinessVariant: Record<TalentReadiness, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  NOT_READY: 'destructive',
  DEVELOPING: 'warning',
  READY_IN_1_2_YEARS: 'secondary',
  READY_NOW: 'success',
};

export const planStatusLabels: Record<SuccessionPlanStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const planStatusVariant: Record<SuccessionPlanStatus, 'secondary' | 'success' | 'destructive' | 'default'> = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

export const riskLabels: Record<string, string> = {
  LOW: 'Risiko Rendah',
  MEDIUM: 'Risiko Sedang',
  HIGH: 'Risiko Tinggi',
};

export const riskVariant: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'destructive',
};