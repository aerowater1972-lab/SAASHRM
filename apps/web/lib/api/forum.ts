import { api } from '@/lib/api';

export type ForumThreadType = 'ANNOUNCEMENT' | 'DISCUSSION' | 'POLL' | 'EVENT';
export type ForumReactionType = 'LIKE' | 'LOVE' | 'CELEBRATE' | 'INSIGHTFUL' | 'CURIOUS';
export type ForumReportStatus = 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';

/** Sinkron dengan enum di packages/database/schema.prisma (FORUM / GAP-03). */
export const FORUM_THREAD_TYPES: ForumThreadType[] = ['ANNOUNCEMENT', 'DISCUSSION', 'POLL', 'EVENT'];
export const FORUM_REACTIONS: ForumReactionType[] = ['LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'CURIOUS'];

export const forumThreadTypeLabels: Record<string, string> = {
  ANNOUNCEMENT: 'Pengumuman',
  DISCUSSION: 'Diskusi',
  POLL: 'Polling',
  EVENT: 'Acara',
};

export const forumReactionLabels: Record<string, string> = {
  LIKE: '👍 Suka',
  LOVE: '❤️ Suka banget',
  CELEBRATE: '🎉 Rayakan',
  INSIGHTFUL: '💡 Berwawasan',
  CURIOUS: '🤔 Penasaran',
};

export interface ForumThreadListParams {
  type?: string;
  departmentId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== THREADS (IC-03/IC-04) =====

export async function fetchForumThreads(params?: ForumThreadListParams): Promise<ListResponse<any>> {
  return api.get<ListResponse<any>>('/forum/threads', { params: params as Record<string, unknown> });
}

export async function fetchForumThread(id: string): Promise<any> {
  return api.get(`/forum/threads/${id}`);
}

export async function createForumThread(data: {
  title: string;
  content: string;
  type?: ForumThreadType;
  visibility?: string;
  departmentId?: string;
  pollOptions?: string[];
  eventAt?: string;
  eventLocation?: string;
}): Promise<any> {
  return api.post('/forum/threads', data);
}

export async function updateForumThread(id: string, data: {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isLocked?: boolean;
}): Promise<any> {
  return api.patch(`/forum/threads/${id}`, data);
}

export async function deleteForumThread(id: string): Promise<any> {
  return api.delete(`/forum/threads/${id}`);
}

// ===== COMMENTS (IC-04) =====

export async function addForumComment(threadId: string, data: { content: string; parentCommentId?: string }): Promise<any> {
  return api.post(`/forum/threads/${threadId}/comments`, data);
}

export async function deleteForumComment(threadId: string, commentId: string): Promise<any> {
  return api.delete(`/forum/threads/${threadId}/comments/${commentId}`);
}

// ===== REACTIONS + POLL (IC-03) =====

export async function reactForumThread(id: string, reactionType: ForumReactionType): Promise<any> {
  return api.post(`/forum/threads/${id}/reactions`, { reactionType });
}

export async function reactForumComment(id: string, reactionType: ForumReactionType): Promise<any> {
  return api.post(`/forum/comments/${id}/reactions`, { reactionType });
}

export async function voteForumPoll(id: string, optionIndex: number): Promise<any> {
  return api.post(`/forum/threads/${id}/vote`, { optionIndex });
}

// ===== MODERASI (IC-05) =====

export async function reportForumThread(id: string, reason: string): Promise<any> {
  return api.post(`/forum/threads/${id}/report`, { reason });
}

export async function reportForumComment(id: string, reason: string): Promise<any> {
  return api.post(`/forum/comments/${id}/report`, { reason });
}

export async function fetchForumReports(status?: string): Promise<any[]> {
  return api.get<any[]>('/forum/reports', { params: { status } as Record<string, unknown> });
}

export async function reviewForumReport(id: string, data: { status: ForumReportStatus; action?: string }): Promise<any> {
  return api.patch(`/forum/reports/${id}`, data);
}
