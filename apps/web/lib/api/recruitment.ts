import { api } from '@/lib/api';
import type { JobPosting, Candidate, Application } from '@/lib/types';

async function paginated<T>(url: string, params?: any): Promise<{ data: T[]; total: number }> {
  const res: any = await api.get(url, { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchJobs(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: JobPosting[]; total: number }> {
  return paginated<JobPosting>('/recruitment/jobs', params);
}

export async function fetchJob(id: string): Promise<JobPosting> {
  return api.get(`/recruitment/jobs/${id}`);
}

export async function createJob(data: any): Promise<JobPosting> {
  return api.post('/recruitment/jobs', data);
}

export async function updateJob(id: string, data: any): Promise<JobPosting> {
  return api.put(`/recruitment/jobs/${id}`, data);
}

export async function fetchCandidates(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Candidate[]; total: number }> {
  return paginated<Candidate>('/recruitment/candidates', params);
}

export async function fetchCandidate(id: string): Promise<Candidate> {
  return api.get(`/recruitment/candidates/${id}`);
}

export async function createCandidate(data: any): Promise<Candidate> {
  return api.post('/recruitment/candidates', data);
}

export async function fetchApplications(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: Application[]; total: number }> {
  return paginated<Application>('/recruitment/applications', params);
}

export async function fetchApplication(id: string): Promise<Application> {
  return api.get(`/recruitment/applications/${id}`);
}

export async function fetchRequisitions(): Promise<any[]> {
  const res: any = await api.get('/recruitment/requisitions');
  return Array.isArray(res) ? res : (res.data ?? []);
}

export async function createRequisition(data: any): Promise<any> {
  return api.post('/recruitment/requisitions', data);
}

export async function updateRequisitionStatus(id: string, status: string): Promise<any> {
  return api.put(`/recruitment/requisitions/${id}`, { status });
}

export async function getPipeline(): Promise<Record<string, Application[]>> {
  const res: any = await api.get('/recruitment/pipeline');
  return res.data ?? res ?? {};
}

export async function updateApplicationStatus(id: string, status: string): Promise<Application> {
  return api.put<Application>(`/recruitment/applications/${id}/status`, { status });
}

export async function publishJob(id: string): Promise<void> {
  return api.post(`/recruitment/jobs/${id}/publish`, {});
}

export async function closeJob(id: string): Promise<void> {
  return api.post(`/recruitment/jobs/${id}/close`, {});
}
