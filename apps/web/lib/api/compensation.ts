import { api } from '@/lib/api';

export type CompAdjustmentType = 'MERIT' | 'PROMOTION' | 'MARKET_ADJUST' | 'COLA';
export type CompAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'CANCELLED';
export type CompCycleStatus = 'DRAFT' | 'OPEN' | 'IN_REVIEW' | 'APPROVED' | 'APPLIED' | 'CLOSED' | 'CANCELLED';

/** Sinkron dengan enum di packages/database/schema.prisma (COMPENSATION / GAP-06). */
export const COMP_ADJUSTMENT_TYPES: CompAdjustmentType[] = ['MERIT', 'PROMOTION', 'MARKET_ADJUST', 'COLA'];

export const compAdjustmentTypeLabels: Record<string, string> = {
  MERIT: 'Merit (kinerja)',
  PROMOTION: 'Promosi',
  MARKET_ADJUST: 'Penyesuaian pasar',
  COLA: 'Penyesuaian biaya hidup',
};

export const compStatusLabels: Record<string, string> = {
  DRAFT: 'Draf',
  OPEN: 'Terbuka',
  IN_REVIEW: 'Direview',
  APPROVED: 'Disetujui',
  APPLIED: 'Diterapkan',
  CLOSED: 'Ditutup',
  CANCELLED: 'Dibatalkan',
  PENDING: 'Menunggu',
  REJECTED: 'Ditolak',
};

// ===== SALARY STRUCTURE (CM-01/CM-03) =====

export async function fetchSalaryStructures(params?: { jobFamily?: string; grade?: string }): Promise<any[]> {
  return api.get<any[]>('/compensation/structures', { params: params as Record<string, unknown> });
}

export async function createSalaryStructure(data: {
  jobFamily: string;
  grade: string;
  minSalary: number;
  midSalary: number;
  maxSalary: number;
  currency?: string;
  effectiveDate: string;
}): Promise<any> {
  return api.post('/compensation/structures', data);
}

export async function updateSalaryStructure(id: string, data: Partial<Parameters<typeof createSalaryStructure>[0]>): Promise<any> {
  return api.patch(`/compensation/structures/${id}`, data);
}

export async function deleteSalaryStructure(id: string): Promise<any> {
  return api.delete(`/compensation/structures/${id}`);
}

// ===== REVIEW CYCLE (CM-02/CM-04) =====

export async function fetchReviewCycles(status?: string): Promise<any[]> {
  return api.get<any[]>('/compensation/cycles', { params: { status } as Record<string, unknown> });
}

export async function fetchReviewCycle(id: string): Promise<any> {
  return api.get(`/compensation/cycles/${id}`);
}

export async function createReviewCycle(data: {
  name: string;
  type?: string;
  effectiveDate: string;
  totalBudget?: number;
}): Promise<any> {
  return api.post('/compensation/cycles', data);
}

export async function openReviewCycle(id: string): Promise<any> {
  return api.post(`/compensation/cycles/${id}/open`);
}

export async function approveReviewCycle(id: string): Promise<any> {
  return api.post(`/compensation/cycles/${id}/approve`);
}

export async function closeReviewCycle(id: string): Promise<any> {
  return api.post(`/compensation/cycles/${id}/close`);
}

// ===== ADJUSTMENTS (CM-04) =====

export async function createAdjustment(data: {
  reviewCycleId?: string;
  employeeId: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentType?: CompAdjustmentType;
  reason?: string;
  effectiveDate: string;
}): Promise<any> {
  return api.post('/compensation/adjustments', data);
}

export async function bulkAdjustments(data: { reviewCycleId?: string; items: Array<Omit<Parameters<typeof createAdjustment>[0], 'reviewCycleId'>> }): Promise<any> {
  return api.post('/compensation/adjustments/bulk', data);
}

export async function approveAdjustment(id: string): Promise<any> {
  return api.post(`/compensation/adjustments/${id}/approve`);
}

export async function rejectAdjustment(id: string): Promise<any> {
  return api.post(`/compensation/adjustments/${id}/reject`);
}

export async function syncAdjustmentToPayroll(id: string, description?: string): Promise<any> {
  return api.post(`/compensation/adjustments/${id}/sync-payroll`, { description });
}

// ===== ANALYTICS (CM-05) =====

export async function fetchEquityAnalysis(params?: { jobFamily?: string; page?: number; limit?: number }): Promise<any> {
  return api.get('/compensation/analytics/equity', { params: params as Record<string, unknown> });
}

export async function fetchTotalRewards(employeeId: string): Promise<any> {
  return api.get(`/compensation/employees/${employeeId}/total-rewards`);
}
