import { api } from '@/lib/api';

export interface ViolationCategory {
  id: string; tenantId: string; name: string; code: string;
  description?: string; severity: number; canSkipSP1: boolean;
  isActive: boolean; createdAt: string; updatedAt: string;
}
export interface DisciplinaryCase {
  id: string; tenantId: string; employeeId: string;
  violationCategoryId: string; spLevel: string; description: string;
  issuedDate: string; validUntil?: string; status: string;
  approvedById?: string; acknowledgedAt?: string; notes?: string;
  employee?: { id: string; fullName: string; employeeId: string };
  violationCategory?: ViolationCategory;
  approvedBy?: { id: string; fullName: string };
}
export interface IncidentReport {
  id: string; tenantId: string; employeeId: string;
  location: string; incidentDate: string; severity: string;
  category: string; description: string; status: string;
  authorityReportDeadline?: string; authorityReportedAt?: string;
  resolutionNotes?: string;
  employee?: { id: string; fullName: string; employeeId: string };
}
export interface PpeAssignment {
  id: string; tenantId: string; employeeId: string;
  ppeType: string; assignedDate: string; expiryDate?: string;
  condition: string; status: string; notes?: string;
  employee?: { id: string; fullName: string; employeeId: string };
}
export interface K3Dashboard {
  totalIncidents: number; accidents: number; nearMisses: number;
  nearMissToAccidentRatio: string; openInvestigations: number;
  pendingAuthorityReport: number; ppeExpiringSoon: number;
}
export interface Branding {
  tenantId: string; primaryColor: string; secondaryColor: string;
  logoUrl?: string; faviconUrl?: string;
}

export async function fetchViolationCategories(): Promise<ViolationCategory[]> {
  const res = await api.get<any[]>('/violation-categories');
  return res;
}
export async function createViolationCategory(data: Partial<ViolationCategory>): Promise<ViolationCategory> {
  return api.post<any>('/violation-categories', data);
}

export async function fetchDisciplinaryCases(employeeId?: string): Promise<DisciplinaryCase[]> {
  const q = employeeId ? `?employeeId=${employeeId}` : '';
  return api.get<any[]>(`/disciplinary-cases${q}`);
}
export async function createDisciplinaryCase(data: any): Promise<DisciplinaryCase> {
  return api.post<any>('/disciplinary-cases', data);
}
export async function approveDisciplinaryCase(id: string, approvedById: string): Promise<DisciplinaryCase> {
  return api.post<any>(`/disciplinary-cases/${id}/approve`, { approvedById });
}
export async function acknowledgeDisciplinaryCase(id: string): Promise<DisciplinaryCase> {
  return api.post<any>(`/disciplinary-cases/${id}/acknowledge`, {});
}
export async function escalateUnacknowledgedCases(): Promise<any> {
  return api.post<any>('/disciplinary-cases/escalate-unacknowledged');
}
export async function fetchDisciplinaryHistory(employeeId: string): Promise<DisciplinaryCase[]> {
  return api.get<any[]>(`/employees/${employeeId}/disciplinary-history`);
}

export async function fetchIncidentReports(status?: string, severity?: string): Promise<IncidentReport[]> {
  const q = new URLSearchParams();
  if (status) q.set('status', status);
  if (severity) q.set('severity', severity);
  const qs = q.toString();
  return api.get<any[]>(`/incident-reports${qs ? '?' + qs : ''}`);
}
export async function createIncidentReport(data: any): Promise<IncidentReport> {
  return api.post<any>('/incident-reports', data);
}
export async function updateIncidentReport(id: string, data: any): Promise<IncidentReport> {
  return api.put<any>(`/incident-reports/${id}`, data);
}

export async function fetchPpeAssignments(employeeId?: string): Promise<PpeAssignment[]> {
  const q = employeeId ? `?employeeId=${employeeId}` : '';
  return api.get<any[]>(`/ppe-assignments${q}`);
}
export async function createPpeAssignment(data: any): Promise<PpeAssignment> {
  return api.post<any>('/ppe-assignments', data);
}
export async function expirePpeAssignment(id: string): Promise<PpeAssignment> {
  return api.post<any>(`/ppe-assignments/${id}/expire`);
}

export async function fetchK3Dashboard(): Promise<K3Dashboard> {
  return api.get<any>('/k3/dashboard');
}

export interface TrainingCompliance {
  overallComplianceRate: number;
  totalActiveEmployees: number;
  completedEmployees: number;
  pendingEmployees: number;
  byDepartment: { name: string; total: number; completed: number; rate: number }[];
  upcomingTrainings: any[];
}
export async function fetchK3TrainingCompliance(): Promise<TrainingCompliance> {
  return api.get<any>('/k3/training-compliance');
}
export async function fetchK3TrainingRecommendations(violationCategoryId?: string): Promise<any[]> {
  const q = violationCategoryId ? `?violationCategoryId=${violationCategoryId}` : '';
  return api.get<any[]>(`/k3/training-recommendations${q}`);
}
export async function fetchEmployeeK3Profile(employeeId: string): Promise<any> {
  return api.get<any>(`/employees/${employeeId}/k3-profile`);
}

export interface PpeComplianceResult {
  blocked: boolean;
  reason: string | null;
  ppeId: string | null;
}
export async function fetchPpeCompliance(employeeId: string): Promise<PpeComplianceResult> {
  return api.get<PpeComplianceResult>(`/k3/ppe-compliance/${employeeId}`);
}
export async function fetchMyPpeCompliance(): Promise<PpeComplianceResult> {
  return api.get<PpeComplianceResult>('/k3/ppe-compliance/me');
}

export async function fetchBranding(): Promise<Branding> {
  return api.get<any>('/admin/branding');
}
export async function upsertBranding(data: Partial<Branding>): Promise<Branding> {
  return api.put<any>('/admin/branding', data);
}

export interface GrievanceCase {
  id: string; tenantId: string; reporterId: string; handlerId?: string;
  category: string; subject: string; description: string;
  isConfidential: boolean; status: string; resolution?: string;
}
export async function reportGrievance(data: {
  category: string; subject: string; description: string; isConfidential?: boolean;
}): Promise<GrievanceCase> {
  return api.post<any>('/employee-relations/collective/grievances', data);
}
export async function fetchGrievances(): Promise<GrievanceCase[]> {
  return api.get<any[]>('/employee-relations/collective/grievances');
}
export async function assignGrievanceHandler(id: string, handlerUserId: string): Promise<GrievanceCase> {
  return api.put<any>(`/employee-relations/collective/grievances/${id}/assign`, { handlerUserId });
}
export async function advanceGrievance(id: string, data: { to: string; resolution?: string }): Promise<GrievanceCase> {
  return api.put<any>(`/employee-relations/collective/grievances/${id}/advance`, data);
}
export interface BipartiteSession {
  id: string; sessionDate: string; topic: string;
  managementAttendees: string; workerAttendees: string;
  minutes?: string; followUps?: string; status: string;
}
export async function fetchBipartiteSessions(): Promise<BipartiteSession[]> {
  return api.get<any[]>('/employee-relations/collective/bipartite');
}
export async function scheduleBipartite(data: {
  sessionDate: string; topic: string; managementAttendees: string[]; workerAttendees: string[];
}): Promise<BipartiteSession> {
  return api.post<any>('/employee-relations/collective/bipartite', data);
}
export async function holdBipartite(
  id: string,
  data: { minutes: string; followUps?: { task: string; owner: string; dueDate: string }[] },
): Promise<BipartiteSession> {
  return api.put<any>(`/employee-relations/collective/bipartite/${id}/hold`, data);
}
export async function closeBipartite(
  id: string,
  data?: { followUps?: { task: string; owner: string; dueDate: string; done: boolean }[] },
): Promise<BipartiteSession> {
  return api.put<any>(`/employee-relations/collective/bipartite/${id}/close`, data ?? {});
}
