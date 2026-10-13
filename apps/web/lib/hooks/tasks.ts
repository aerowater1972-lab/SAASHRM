import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  fetchTasks,
  fetchTask,
  fetchGanttBoard,
  fetchTaskStats,
  fetchMyTasks,
  createTask,
  updateTask,
  deleteTask,
  addTaskComment,
  logTaskHours,
  type ProjectListParams,
  type TaskListParams,
} from '@/lib/api/tasks';

// ===== PROJECTS =====
export function useProjects(params?: ProjectListParams, enabled = true) {
  return useQuery({ queryKey: ['tasks', 'projects', params], queryFn: () => fetchProjects(params), enabled });
}
export function useProject(id: string) {
  return useQuery({ queryKey: ['tasks', 'project', id], queryFn: () => fetchProject(id), enabled: !!id });
}
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createProject>[0]) => createProject(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'projects'] }),
  });
}
export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateProject>[1] }) => updateProject(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks', 'projects'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'project', id] });
    },
  });
}
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'projects'] }),
  });
}
export function useAddProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { employeeId: string; role?: string } }) => addProjectMember(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['tasks', 'project', id] }),
  });
}

// ===== TASKS =====
export function useTasks(params?: TaskListParams) {
  return useQuery({ queryKey: ['tasks', 'list', params], queryFn: () => fetchTasks(params) });
}
export function useTask(id: string) {
  return useQuery({ queryKey: ['tasks', 'task', id], queryFn: () => fetchTask(id), enabled: !!id });
}
export function useGanttBoard(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', 'gantt', projectId ?? 'all'],
    queryFn: () => fetchGanttBoard(projectId),
  });
}
export function useTaskStats() {
  return useQuery({ queryKey: ['tasks', 'stats'], queryFn: fetchTaskStats });
}
export function useMyTasks() {
  return useQuery({ queryKey: ['tasks', 'my'], queryFn: fetchMyTasks });
}
export function useLogTaskHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) => logTaskHours(id, hours),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'task', id] });
      qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'stats'] });
    },
  });
}
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createTask>[0]) => createTask(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'stats'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'project'] });
    },
  });
}
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTask>[1] }) => updateTask(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'task', id] });
      qc.invalidateQueries({ queryKey: ['tasks', 'stats'] });
    },
  });
}
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'stats'] });
    },
  });
}
export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => addTaskComment(id, content),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['tasks', 'task', id] }),
  });
}
