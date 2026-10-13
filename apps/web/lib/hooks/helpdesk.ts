import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyTickets,
  fetchTicketQueue,
  fetchTicket,
  createTicket,
  addTicketComment,
  rateTicket,
  assignTicket,
  updateTicketStatus,
  bulkAssignTickets,
  bulkUpdateTicketStatus,
  fetchHelpdeskStats,
  searchKb,
  suggestKb,
  fetchKbArticle,
  rateKbArticle,
  fetchKbArticlesAdmin,
  createKbArticle,
  updateKbArticle,
  deleteKbArticle,
  type TicketListParams,
} from '@/lib/api/helpdesk';

export function useMyTickets(params?: TicketListParams) {
  return useQuery({ queryKey: ['helpdesk', 'my', params], queryFn: () => fetchMyTickets(params) });
}

export function useTicketQueue(params?: TicketListParams) {
  return useQuery({ queryKey: ['helpdesk', 'queue', params], queryFn: () => fetchTicketQueue(params) });
}

export function useTicket(id: string) {
  return useQuery({ queryKey: ['helpdesk', 'ticket', id], queryFn: () => fetchTicket(id), enabled: !!id });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createTicket>[0]) => createTicket(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['helpdesk', 'my'] });
      qc.invalidateQueries({ queryKey: ['helpdesk', 'queue'] });
    },
  });
}

export function useAddTicketComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content: string; isInternal?: boolean } }) =>
      addTicketComment(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['helpdesk', 'ticket', id] }),
  });
}

export function useRateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => rateTicket(id, rating),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['helpdesk', 'ticket', id] }),
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) => assignTicket(id, assignedToId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['helpdesk', 'queue'] });
      qc.invalidateQueries({ queryKey: ['helpdesk', 'ticket'] });
    },
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof updateTicketStatus>[1] }) =>
      updateTicketStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['helpdesk'] });
    },
  });
}

export function useBulkAssignTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, assignedToId }: { ids: string[]; assignedToId: string }) =>
      bulkAssignTickets(ids, assignedToId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['helpdesk', 'queue'] });
    },
  });
}

export function useBulkUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: Parameters<typeof bulkUpdateTicketStatus>[1] }) =>
      bulkUpdateTicketStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['helpdesk'] });
    },
  });
}

export function useHelpdeskStats(enabled = true) {
  return useQuery({ queryKey: ['helpdesk', 'stats'], queryFn: fetchHelpdeskStats, enabled });
}

export function useKbSearch(q: string, limit = 10) {
  return useQuery({ queryKey: ['helpdesk', 'kb', 'search', q, limit], queryFn: () => searchKb(q, limit), enabled: q.trim().length >= 2 });
}

export function useKbSuggest(title: string, limit = 5) {
  return useQuery({
    queryKey: ['helpdesk', 'kb', 'suggest', title, limit],
    queryFn: () => suggestKb(title, limit),
    enabled: title.trim().length >= 3,
  });
}

export function useKbArticle(id: string) {
  return useQuery({ queryKey: ['helpdesk', 'kb', 'article', id], queryFn: () => fetchKbArticle(id), enabled: !!id });
}

export function useRateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) => rateKbArticle(id, helpful),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['helpdesk', 'kb', 'article', id] }),
  });
}

export function useKbArticlesAdmin(category?: string) {
  return useQuery({
    queryKey: ['helpdesk', 'kb', 'admin', category ?? 'all'],
    queryFn: () => fetchKbArticlesAdmin(category),
  });
}

export function useCreateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createKbArticle>[0]) => createKbArticle(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['helpdesk', 'kb'] }),
  });
}

export function useUpdateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateKbArticle>[1] }) =>
      updateKbArticle(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['helpdesk', 'kb'] }),
  });
}

export function useDeleteKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKbArticle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['helpdesk', 'kb'] }),
  });
}
