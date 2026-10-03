import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoles,
  createRole,
  deleteRole,
  fetchPermissions,
  assignPermission,
  removePermission,
  assignRoleToUser,
  removeRoleFromUser,
  fetchTenants,
  createTenant,
  updateTenant,
  fetchUsers,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  resetUserPassword,
  fetchAuditLogs,
  fetchWorkflows,
  createWorkflow,
  updateWorkflow,
  fetchFeatureFlags,
  toggleFeatureFlag,
  fetchIntegrations,
  bulkImportEmployees,
} from '@/lib/api/admin';
import type { CreateRoleInput, CreateTenantInput, CreateWorkflowInput, CreateUserInput } from '@/lib/schemas/admin';

export function useRoles() {
  return useQuery({ queryKey: ['admin', 'roles'], queryFn: fetchRoles });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleInput) => createRole(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });
}

export function usePermissions() {
  return useQuery({ queryKey: ['admin', 'permissions'], queryFn: fetchPermissions });
}

export function useAssignPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => assignPermission(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });
}

export function useRemovePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      removePermission(roleId, permissionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });
}

export function useAssignRoleToUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRoleToUser(userId, { roleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });
}

export function useRemoveRoleFromUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeRoleFromUser(userId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });
}

export function useTenants() {
  return useQuery({ queryKey: ['admin', 'tenants'], queryFn: fetchTenants });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantInput) => createTenant(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useUsers(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => fetchUsers(params),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => createUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserInput> }) => updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) => resetUserPassword(id, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useAuditLogs(params?: { page?: number; limit?: number; module?: string; entity?: string; action?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
  });
}

export function useWorkflows() {
  return useQuery({ queryKey: ['admin', 'workflows'], queryFn: fetchWorkflows });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowInput) => createWorkflow(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'workflows'] }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkflowInput> }) =>
      updateWorkflow(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'workflows'] }),
  });
}

export function useFeatureFlags() {
  return useQuery({ queryKey: ['admin', 'feature-flags'], queryFn: fetchFeatureFlags });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleFeatureFlag(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feature-flags'] }),
  });
}

export function useIntegrations() {
  return useQuery({ queryKey: ['admin', 'integrations'], queryFn: fetchIntegrations });
}

export function useBulkImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { rows: Record<string, string>[] }) => bulkImportEmployees(data),
  });
}
