import { api } from '@/lib/api';

export type AnnouncementTypeCode = 'GENERAL' | 'URGENT' | 'EVENT' | 'POLICY' | 'MAINTENANCE' | 'CELEBRATION';
export type AnnouncementPriorityCode = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type AnnouncementStatusCode = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type AnnouncementAudienceCode = 'ALL' | 'DEPARTMENT' | 'ROLE' | 'USER' | 'LOCATION';

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  type: AnnouncementTypeCode;
  priority: AnnouncementPriorityCode;
  status: AnnouncementStatusCode;
  targetAudience: AnnouncementAudienceCode;
  targetIds: string[];
  publishAt: string | null;
  expireAt: string | null;
  attachmentUrls: string[];
  readReceiptRequired: boolean;
  allowComments: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isExpired?: boolean;
  creator?: { id: string; fullName: string; email: string } | null;
}

export interface AnnouncementStats {
  total: number;
  published: number;
  scheduled: number;
  drafts: number;
  byType: { type: string; count: number }[];
}

export interface AnnouncementListParams {
  status?: string;
  type?: string;
  search?: string;
  mine?: string;
}

export async function fetchAnnouncements(params?: AnnouncementListParams): Promise<Announcement[]> {
  return api.get<Announcement[]>('/announcements', { params: params as Record<string, unknown> });
}

export async function fetchAnnouncement(id: string): Promise<Announcement> {
  return api.get<Announcement>(`/announcements/${id}`);
}

export async function fetchAnnouncementStats(): Promise<AnnouncementStats> {
  return api.get<AnnouncementStats>('/announcements/stats');
}

export async function createAnnouncement(data: Record<string, unknown>): Promise<Announcement> {
  return api.post<Announcement>('/announcements', data);
}

export async function updateAnnouncement(id: string, data: Record<string, unknown>): Promise<Announcement> {
  return api.put<Announcement>(`/announcements/${id}`, data);
}

export async function updateAnnouncementStatus(id: string, status: string): Promise<Announcement> {
  return api.put<Announcement>(`/announcements/${id}/status`, { status });
}

export async function publishAnnouncementNow(id: string): Promise<Announcement> {
  return api.post<Announcement>(`/announcements/${id}/publish`);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return api.delete(`/announcements/${id}`);
}