import { api } from '@/lib/api';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectMemberRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';

/** Sinkron dengan enum di packages/database/schema.prisma (TASK & PROJECT MANAGEMENT). */
export const PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
export const PROJECT_PRIORITIES: ProjectPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const TASK_STATUSES: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const PROJECT_MEMBER_ROLES: ProjectMemberRole[] = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'];

/** Kolom kanban: kolom CANCELLED tidak ada di enum, dipetakan ke BLOCKED. */
export const KANBAN_COLUMNS: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const projectStatusLabels: Record<string, string> = {
  PLANNING: 'Perencanaan',
  ACTIVE: 'Aktif',
  ON_HOLD: 'Ditahan',
  COMPLETED: 'Selesai',
  ARCHIVED: 'Diarsipkan',
};

export const taskStatusLabels: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'Dikerjakan',
  IN_REVIEW: 'Review',
  DONE: 'Selesai',
  BLOCKED: 'Terhambat',
};

export const priorityLabels: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  URGENT: 'Mendesak',
};

export interface ProjectListParams {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface TaskListParams {
  projectId?: string;
  assigneeEmployeeId?: string;
  status?: string;
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

// ===== PROJECTS =====

export async function fetchProjects(params?: ProjectListParams): Promise<ListResponse<any>> {
  return api.get<ListResponse<any>>('/tasks/projects', { params: params as Record<string, unknown> });
}

export async function fetchProject(id: string): Promise<any> {
  return api.get(`/tasks/projects/${id}`);
}

export async function createProject(data: {
  name: string;
  code: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  ownerUserId: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
}): Promise<any> {
  return api.post('/tasks/projects', data);
}

export async function updateProject(id: string, data: Partial<Parameters<typeof createProject>[0]>): Promise<any> {
  return api.patch(`/tasks/projects/${id}`, data);
}

export async function deleteProject(id: string): Promise<any> {
  return api.post(`/tasks/projects/${id}/delete`);
}

export async function addProjectMember(id: string, data: { employeeId: string; role?: string }): Promise<any> {
  return api.post(`/tasks/projects/${id}/members`, data);
}

// ===== TASKS =====

export async function fetchTasks(params?: TaskListParams): Promise<ListResponse<any>> {
  return api.get<ListResponse<any>>('/tasks', { params: params as Record<string, unknown> });
}

export async function fetchTask(id: string): Promise<any> {
  return api.get(`/tasks/${id}`);
}

export interface GanttTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  estimateHours?: number | null;
  project?: { id: string; name: string; code: string } | null;
  assignee?: { id: string; fullName: string } | null;
}

export interface GanttDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH';
}

export interface GanttBoardResponse {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
}

export async function fetchGanttBoard(projectId?: string): Promise<GanttBoardResponse> {
  return api.get<GanttBoardResponse>('/tasks/gantt', {
    params: (projectId ? { projectId } : {}) as Record<string, unknown>,
  });
}

export async function fetchTaskStats(): Promise<{ total: number; overdue: number; byStatus: Record<string, number> }> {
  return api.get('/tasks/stats');
}

export async function fetchMyTasks(): Promise<{ items: any[]; total: number; overdue: number; dueToday: number }> {
  return api.get('/tasks/my');
}

export async function logTaskHours(id: string, hours: number): Promise<any> {
  return api.post(`/tasks/${id}/log-hours`, { hours });
}

export async function createTask(data: {
  title: string;
  description?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeEmployeeId?: string;
  dueDate?: string;
  estimateHours?: number;
  tags?: string[];
  parentTaskId?: string;
}): Promise<any> {
  return api.post('/tasks', data);
}

export async function updateTask(id: string, data: Partial<Parameters<typeof createTask>[0]>): Promise<any> {
  return api.patch(`/tasks/${id}`, data);
}

export async function deleteTask(id: string): Promise<any> {
  return api.post(`/tasks/${id}/delete`);
}

export async function addTaskComment(id: string, content: string): Promise<any> {
  return api.post(`/tasks/${id}/comments`, { content });
}
