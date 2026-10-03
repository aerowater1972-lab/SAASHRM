import { api } from '@/lib/api';

export interface DocumentCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: { documents: number };
}

export type DocumentStatusCode = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ACTIVE' | 'ARCHIVED' | 'EXPIRED';

export interface HrDocument {
  id: string;
  tenantId: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  content: string | null;
  version: number;
  status: DocumentStatusCode;
  accessLevel: string;
  departmentId: string | null;
  tags: string[];
  isTemplate: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  publishedAt: string | null;
  category?: DocumentCategory | { id: string; name: string; color: string | null; icon: string | null } | null;
  creator?: { id: string; fullName: string; email: string } | null;
  versions?: DocumentVersion[];
  departments?: { id: string; name: string } | null;
  permissions?: DocumentPermission[];
  signatures?: DocumentSignature[];
  activities?: DocumentActivity[];
  _count?: { versions: number; signatures: number; permissions: number };
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  changeLog: string | null;
  createdById: string;
  createdAt: string;
}

export interface DocumentPermission {
  id: string;
  documentId: string;
  permissionType: string;
  targetId: string;
  permission: string;
  createdAt: string;
  createdById: string;
}

export interface DocumentSignature {
  id: string;
  documentId: string;
  documentVersion: number | null;
  userId: string;
  status: string;
  signatureData: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; email: string };
}

export interface DocumentActivity {
  id: string;
  documentId: string;
  userId: string;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
}

export interface DocumentListParams {
  categoryId?: string;
  status?: string;
  search?: string;
  departmentId?: string;
  isTemplate?: string;
}

export async function fetchDocumentCategories(): Promise<DocumentCategory[]> {
  return api.get<DocumentCategory[]>('/documents/categories');
}

export async function createDocumentCategory(data: Record<string, unknown>): Promise<DocumentCategory> {
  return api.post<DocumentCategory>('/documents/categories', data);
}

export async function updateDocumentCategory(id: string, data: Record<string, unknown>): Promise<DocumentCategory> {
  return api.put<DocumentCategory>(`/documents/categories/${id}`, data);
}

export async function deleteDocumentCategory(id: string): Promise<void> {
  return api.delete(`/documents/categories/${id}`);
}

export async function fetchDocuments(params?: DocumentListParams): Promise<HrDocument[]> {
  return api.get<HrDocument[]>('/documents', { params: params as Record<string, unknown> });
}

export async function fetchDocument(id: string): Promise<HrDocument> {
  return api.get<HrDocument>(`/documents/${id}`);
}

export async function fetchDocumentActivities(id: string): Promise<DocumentActivity[]> {
  return api.get<DocumentActivity[]>(`/documents/${id}/activities`);
}

export async function createDocument(data: Record<string, unknown>): Promise<HrDocument> {
  return api.post<HrDocument>('/documents', data);
}

export async function updateDocument(id: string, data: Record<string, unknown>): Promise<HrDocument> {
  return api.put<HrDocument>(`/documents/${id}`, data);
}

export async function updateDocumentStatus(id: string, status: string): Promise<HrDocument> {
  return api.put<HrDocument>(`/documents/${id}/status`, { status });
}

export async function deleteDocument(id: string): Promise<void> {
  return api.delete(`/documents/${id}`);
}

export async function createDocumentVersion(id: string, data: Record<string, unknown>): Promise<DocumentVersion> {
  return api.post<DocumentVersion>(`/documents/${id}/versions`, data);
}

export async function addDocumentPermission(id: string, data: Record<string, unknown>): Promise<DocumentPermission> {
  return api.post<DocumentPermission>(`/documents/${id}/permissions`, data);
}

export async function updateDocumentPermission(id: string, permissionId: string, data: Record<string, unknown>): Promise<DocumentPermission> {
  return api.put<DocumentPermission>(`/documents/${id}/permissions/${permissionId}`, data);
}

export async function removeDocumentPermission(id: string, permissionId: string): Promise<void> {
  return api.delete(`/documents/${id}/permissions/${permissionId}`);
}

export async function requestDocumentSignature(id: string, userIds: string[]): Promise<DocumentSignature> {
  return api.post<DocumentSignature>(`/documents/${id}/signatures/request`, { userIds });
}

export async function signDocument(id: string, data: Record<string, unknown>): Promise<DocumentSignature> {
  return api.post<DocumentSignature>(`/documents/${id}/signature`, data);
}