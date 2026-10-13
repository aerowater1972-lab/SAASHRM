import { api } from '@/lib/api';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'PAYROLL' | 'LEAVE' | 'DOCUMENT' | 'POLICY' | 'BENEFIT' | 'OTHER';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface TicketListParams {
  status?: string;
  category?: string;
  priority?: string;
  assignedToId?: string;
  unassignedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface TicketListResponse {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchMyTickets(params?: TicketListParams): Promise<TicketListResponse> {
  return api.get<TicketListResponse>('/helpdesk/my-tickets', { params: params as Record<string, unknown> });
}

export async function fetchTicketQueue(params?: TicketListParams): Promise<TicketListResponse> {
  return api.get<TicketListResponse>('/helpdesk/tickets', { params: params as Record<string, unknown> });
}

export async function fetchTicket(id: string): Promise<any> {
  return api.get(`/helpdesk/tickets/${id}`);
}

export async function createTicket(data: {
  category: TicketCategory;
  title: string;
  description: string;
  priority?: TicketPriority;
}): Promise<any> {
  return api.post('/helpdesk/tickets', data);
}

export async function addTicketComment(id: string, data: { content: string; isInternal?: boolean }): Promise<any> {
  return api.post(`/helpdesk/tickets/${id}/comments`, data);
}

export async function rateTicket(id: string, rating: number): Promise<any> {
  return api.post(`/helpdesk/tickets/${id}/rate`, { rating });
}

export async function assignTicket(id: string, assignedToId: string): Promise<any> {
  return api.patch(`/helpdesk/tickets/${id}/assign`, { assignedToId });
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<any> {
  return api.patch(`/helpdesk/tickets/${id}/status`, { status });
}

export async function bulkAssignTickets(ids: string[], assignedToId: string): Promise<any> {
  return api.post('/helpdesk/tickets/bulk-assign', { ids, assignedToId });
}

export async function bulkUpdateTicketStatus(ids: string[], status: TicketStatus): Promise<any> {
  return api.post('/helpdesk/tickets/bulk-status', { ids, status });
}

export async function fetchHelpdeskStats(): Promise<any> {
  return api.get('/helpdesk/stats');
}

export async function searchKb(q: string, limit = 10): Promise<any[]> {
  const res: any = await api.get('/helpdesk/kb/search', { params: { q, limit } });
  return Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
}

export async function suggestKb(title: string, limit = 5): Promise<any[]> {
  const res: any = await api.get('/helpdesk/kb/suggest', { params: { title, limit } });
  return Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
}

export async function fetchKbArticle(id: string): Promise<any> {
  return api.get(`/helpdesk/kb/articles/${id}`);
}

export async function rateKbArticle(id: string, helpful: boolean): Promise<any> {
  return api.post(`/helpdesk/kb/articles/${id}/rate`, { helpful });
}

export interface KbArticlePayload {
  category?: TicketCategory;
  title: string;
  content: string;
  tags?: string[];
}

export async function fetchKbArticlesAdmin(category?: string): Promise<any[]> {
  const res: any = await api.get('/helpdesk/kb/articles', { params: category ? { category } : {} });
  return Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
}

export async function createKbArticle(data: KbArticlePayload): Promise<any> {
  return api.post('/helpdesk/kb/articles', data);
}

export async function updateKbArticle(id: string, data: Partial<KbArticlePayload>): Promise<any> {
  return api.patch(`/helpdesk/kb/articles/${id}`, data);
}

export async function deleteKbArticle(id: string): Promise<any> {
  return api.post(`/helpdesk/kb/articles/${id}/delete`);
}
