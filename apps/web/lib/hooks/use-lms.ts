import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import * as lmsApi from '@/lib/api/lms';
import type { Course, CourseTrainee, PaginatedResponse } from '@/lib/types';

export function useCourses(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<Course>, Error>({
    queryKey: queryKeys.lms.list(params),
    queryFn: () => lmsApi.fetchCourses(params as any),
  });
}

export function useCourse(id: string) {
  return useQuery<Course>({
    queryKey: queryKeys.lms.detail(id),
    queryFn: () => lmsApi.fetchCourse(id),
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation<Course, Error, Record<string, unknown>>({
    mutationFn: lmsApi.createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.all });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation<Course, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => lmsApi.updateCourse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.all });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: lmsApi.deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.all });
    },
  });
}

export function useEnrollTrainee() {
  const queryClient = useQueryClient();
  return useMutation<CourseTrainee, Error, { courseId: string; employeeId: string; status?: string }>({
    mutationFn: ({ courseId, employeeId, status }) => lmsApi.enrollTrainee(courseId, { employeeId, status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.detail(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lms.trainees(variables.courseId) });
    },
  });
}

export function useCourseTrainees(courseId: string) {
  return useQuery<CourseTrainee[]>({
    queryKey: queryKeys.lms.trainees(courseId),
    queryFn: () => lmsApi.fetchCourseTrainees(courseId),
    enabled: !!courseId,
  });
}