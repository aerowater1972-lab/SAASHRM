import { api } from '@/lib/api';
import type { Course, CourseEnrollmentStatus, CourseTrainee, QuizAttempt } from '@/lib/types';
import type { PaginatedResponse } from '@/lib/types';

export interface CourseListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export async function fetchCourses(params?: CourseListParams): Promise<PaginatedResponse<Course>> {
  return api.get<PaginatedResponse<Course>>('/lms/courses', { params: params as Record<string, unknown> });
}

export async function fetchCourse(id: string): Promise<Course> {
  return api.get<Course>(`/lms/courses/${id}`);
}

export async function createCourse(data: Record<string, unknown>): Promise<Course> {
  return api.post<Course>('/lms/courses', data);
}

export async function updateCourse(id: string, data: Record<string, unknown>): Promise<Course> {
  return api.put<Course>(`/lms/courses/${id}`, data);
}

export async function deleteCourse(id: string): Promise<void> {
  return api.delete(`/lms/courses/${id}`);
}

export async function enrollTrainee(courseId: string, data: { employeeId: string; status?: string }): Promise<CourseTrainee> {
  return api.post<CourseTrainee>(`/lms/courses/${courseId}/enroll`, data);
}

export async function batchEnroll(courseId: string, data: { employeeIds: string[]; status?: string }): Promise<{ enrolled: number }> {
  return api.post<{ enrolled: number }>(`/lms/courses/${courseId}/batch-enroll`, data);
}

export async function fetchCourseTrainees(courseId: string): Promise<CourseTrainee[]> {
  return api.get<CourseTrainee[]>(`/lms/courses/${courseId}/trainees`);
}
