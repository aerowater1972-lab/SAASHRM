import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import * as announcementsApi from '@/lib/api/announcements';
import type {
  Announcement,
  AnnouncementStats,
  AnnouncementListParams,
} from '@/lib/api/announcements';

export function useAnnouncements(params?: AnnouncementListParams) {
  return useQuery<Announcement[], Error>({
    queryKey: queryKeys.announcements.all,
    queryFn: () => announcementsApi.fetchAnnouncements(params),
  });
}

export function useAnnouncement(id: string) {
  return useQuery<Announcement, Error>({
    queryKey: queryKeys.announcements.detail(id),
    queryFn: () => announcementsApi.fetchAnnouncement(id),
    enabled: !!id,
  });
}

export function useAnnouncementStats() {
  return useQuery<AnnouncementStats, Error>({
    queryKey: queryKeys.announcements.stats,
    queryFn: announcementsApi.fetchAnnouncementStats,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation<Announcement, Error, Record<string, unknown>>({
    mutationFn: announcementsApi.createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.stats });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation<Announcement, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => announcementsApi.updateAnnouncement(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useUpdateAnnouncementStatus() {
  const queryClient = useQueryClient();
  return useMutation<Announcement, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => announcementsApi.updateAnnouncementStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.stats });
    },
  });
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation<Announcement, Error, string>({
    mutationFn: announcementsApi.publishAnnouncementNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.stats });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: announcementsApi.deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.stats });
    },
  });
}