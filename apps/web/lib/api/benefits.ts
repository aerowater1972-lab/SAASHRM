import { api } from '@/lib/api';
import type { Benefit, Asset, Training, Certification, ResignationRequest } from '@/lib/types';

export async function fetchBenefits(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Benefit[]; total: number }> {
  const res: any = await api.get('/benefits', { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchBenefit(id: string): Promise<Benefit> {
  return api.get(`/benefits/${id}`);
}

export async function fetchAssets(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Asset[]; total: number }> {
  const res: any = await api.get('/assets', { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchAsset(id: string): Promise<Asset> {
  return api.get(`/assets/${id}`);
}

export async function fetchTrainings(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Training[]; total: number }> {
  const res: any = await api.get('/learning/trainings', { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchTraining(id: string): Promise<Training> {
  return api.get(`/learning/trainings/${id}`);
}

export async function createTraining(data: any): Promise<Training> {
  return api.post('/learning/trainings', data);
}

export async function updateTraining(id: string, data: any): Promise<Training> {
  return api.put(`/learning/trainings/${id}`, data);
}

export async function fetchCertifications(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Certification[]; total: number }> {
  const res: any = await api.get('/learning/certifications', { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function createCertification(data: any): Promise<Certification> {
  return api.post('/learning/certifications', data);
}

export async function updateCertification(id: string, data: any): Promise<Certification> {
  return api.put(`/learning/certifications/${id}`, data);
}

export async function fetchResignations(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: ResignationRequest[]; total: number }> {
  const res: any = await api.get('/resignation/requests', { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchResignation(id: string): Promise<ResignationRequest> {
  return api.get(`/resignation/requests/${id}`);
}

export async function createResignation(data: any): Promise<ResignationRequest> {
  return api.post('/resignation/requests', data);
}

export async function fetchFinalSettlement(id: string): Promise<any> {
  return api.get(`/resignation/requests/${id}/final-settlement`);
}

export async function createFinalSettlement(id: string, data: any): Promise<any> {
  return api.post(`/resignation/requests/${id}/final-settlement`, data);
}

export async function approveResignation(id: string): Promise<void> {
  return api.put(`/resignation/requests/${id}/approve`, {});
}

export async function rejectResignation(id: string, reason: string): Promise<void> {
  return api.put(`/resignation/requests/${id}/reject`, { reason });
}

export async function offboardResignation(id: string): Promise<void> {
  return api.post(`/resignation/requests/${id}/offboard`, {});
}

export async function updateResignationTask(id: string, taskId: string): Promise<void> {
  return api.put(`/resignation/requests/${id}/tasks/${taskId}`, {});
}

export async function cancelTraining(id: string): Promise<void> {
  return api.post(`/learning/trainings/${id}/cancel`, {});
}

export async function fetchEligibilityRules(): Promise<any[]> {
  return api.get('/benefits/eligibility-rules');
}

export async function createEligibilityRule(data: { benefitId: string; gradeId?: string; departmentId?: string }): Promise<any> {
  return api.post('/benefits/eligibility-rules', data);
}

export async function deleteEligibilityRule(id: string): Promise<void> {
  return api.delete(`/benefits/eligibility-rules/${id}`);
}
