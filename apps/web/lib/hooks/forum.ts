import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchForumThreads,
  fetchForumThread,
  createForumThread,
  updateForumThread,
  deleteForumThread,
  addForumComment,
  deleteForumComment,
  reactForumThread,
  reactForumComment,
  voteForumPoll,
  reportForumThread,
  reportForumComment,
  fetchForumReports,
  reviewForumReport,
  type ForumThreadListParams,
} from '@/lib/api/forum';

// ===== THREADS =====
export function useForumThreads(params?: ForumThreadListParams) {
  return useQuery({ queryKey: ['forum', 'threads', params], queryFn: () => fetchForumThreads(params) });
}
export function useForumThread(id: string) {
  return useQuery({ queryKey: ['forum', 'thread', id], queryFn: () => fetchForumThread(id), enabled: !!id });
}
export function useCreateForumThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createForumThread>[0]) => createForumThread(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', 'threads'] }),
  });
}
export function useUpdateForumThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateForumThread>[1] }) => updateForumThread(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['forum', 'threads'] });
      qc.invalidateQueries({ queryKey: ['forum', 'thread', id] });
    },
  });
}
export function useDeleteForumThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteForumThread(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', 'threads'] }),
  });
}

// ===== COMMENTS / REACTIONS / POLL =====
export function useAddForumComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, data }: { threadId: string; data: { content: string; parentCommentId?: string } }) =>
      addForumComment(threadId, data),
    onSuccess: (_, { threadId }) => qc.invalidateQueries({ queryKey: ['forum', 'thread', threadId] }),
  });
}
export function useDeleteForumComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, commentId }: { threadId: string; commentId: string }) => deleteForumComment(threadId, commentId),
    onSuccess: (_, { threadId }) => qc.invalidateQueries({ queryKey: ['forum', 'thread', threadId] }),
  });
}
export function useReactForumThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reactionType }: { id: string; reactionType: Parameters<typeof reactForumThread>[1] }) =>
      reactForumThread(id, reactionType),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['forum', 'threads'] });
      qc.invalidateQueries({ queryKey: ['forum', 'thread', id] });
    },
  });
}
export function useReactForumComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reactionType, threadId }: { id: string; reactionType: Parameters<typeof reactForumComment>[1]; threadId?: string }) =>
      reactForumComment(id, reactionType),
    onSuccess: (_, { threadId }) => {
      if (threadId) qc.invalidateQueries({ queryKey: ['forum', 'thread', threadId] });
    },
  });
}
export function useVoteForumPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, optionIndex }: { id: string; optionIndex: number }) => voteForumPoll(id, optionIndex),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['forum', 'thread', id] }),
  });
}

// ===== MODERASI =====
export function useReportForumThread() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reportForumThread(id, reason),
  });
}
export function useReportForumComment() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reportForumComment(id, reason),
  });
}
export function useForumReports(status?: string) {
  return useQuery({ queryKey: ['forum', 'reports', status], queryFn: () => fetchForumReports(status) });
}
export function useReviewForumReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof reviewForumReport>[1] }) => reviewForumReport(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', 'reports'] }),
  });
}
