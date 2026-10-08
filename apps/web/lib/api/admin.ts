import { api } from '@/lib/api';
import type { Role, Tenant, Permission, User, AuditLog, WorkflowDefinition, FeatureFlag, Integration } from '@/lib/types';
import type { CreateRoleInput, CreateTenantInput, CreateWorkflowInput, AssignPermissionInput, CreateUserInput } from '@/lib/schemas/admin';

export async function fetchRoles(): Promise<Role[]> {
  return api.get<Role[]>('/admin/roles');
}

export async function createRole(data: CreateRoleInput): Promise<Role> {
  return api.post<Role>('/admin/roles', data);
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/admin/roles/${id}`);
}

export async function fetchPermissions(): Promise<Permission[]> {
  return api.get<Permission[]>('/admin/permissions');
}

export async function assignPermission(data: AssignPermissionInput): Promise<void> {
  await api.post(`/admin/roles/${data.roleId}/permissions`, {
    permissionKeys: data.permissionKeys,
    scope: data.scope,
  });
}

export async function removePermission(roleId: string, permissionId: string): Promise<void> {
  await api.delete(`/admin/roles/${roleId}/permissions/${permissionId}`);
}

export async function assignRoleToUser(userId: string, data: { roleId: string; entityId?: string }): Promise<void> {
  await api.post(`/admin/users/${userId}/roles`, data);
}

export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}/roles/${roleId}`);
}

export async function fetchTenants(): Promise<Tenant[]> {
  return api.get<Tenant[]>('/admin/tenants');
}

export async function createTenant(data: CreateTenantInput): Promise<Tenant> {
  return api.post<Tenant>('/admin/tenants', data);
}

export async function updateTenant(id: string, data: Partial<CreateTenantInput>): Promise<Tenant> {
  return api.put<Tenant>(`/admin/tenants/${id}`, data);
}

export async function fetchUsers(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ data: User[]; total: number; page: number; pageSize: number }> {
  const res = await api.get<any>('/admin/users', { params });
  if (Array.isArray(res)) return { data: res, total: res.length, page: 1, pageSize: res.length };
  return res;
}

export async function createUser(data: CreateUserInput): Promise<User> {
  return api.post<User>('/admin/users', data);
}

export async function updateUser(id: string, data: Partial<CreateUserInput>): Promise<User> {
  return api.patch<User>(`/admin/users/${id}`, data);
}

export async function deactivateUser(id: string): Promise<User> {
  return api.post<User>(`/admin/users/${id}/deactivate`);
}

export async function activateUser(id: string): Promise<User> {
  return api.post<User>(`/admin/users/${id}/activate`);
}

export async function resetUserPassword(id: string, password?: string): Promise<User> {
  return api.post<User>(`/admin/users/${id}/reset-password`, password ? { password } : undefined);
}

export async function fetchAuditLogs(params?: { page?: number; limit?: number; module?: string; entity?: string; action?: string }): Promise<{ data: AuditLog[]; total: number; page: number; pageSize: number }> {
  const res = await api.get<any>('/admin/audit-logs', { params });
  if (Array.isArray(res)) return { data: res, total: res.length, page: 1, pageSize: res.length };
  return res;
}

export async function fetchWorkflows(): Promise<WorkflowDefinition[]> {
  return api.get<WorkflowDefinition[]>('/admin/workflows');
}

export async function createWorkflow(data: CreateWorkflowInput): Promise<WorkflowDefinition> {
  return api.post<WorkflowDefinition>('/admin/workflows', data);
}

export async function updateWorkflow(id: string, data: Partial<CreateWorkflowInput>): Promise<WorkflowDefinition> {
  return api.put<WorkflowDefinition>(`/admin/workflows/${id}`, data);
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  return api.get<FeatureFlag[]>('/admin/feature-flags');
}

export async function toggleFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag> {
  return api.put<FeatureFlag>(`/admin/feature-flags/${id}`, { enabled });
}

/**
 * Evaluate feature flag(s) for the current tenant. Fail-closed:
 * missing flag resolves to `false`.
 */
export async function evaluateFeatureFlags(features: string[]): Promise<Record<string, boolean>> {
  if (features.length === 0) return {};
  const qs = features.map((f) => `feature=${encodeURIComponent(f)}`).join('&');
  return api.get<Record<string, boolean>>(`/admin/feature-flags/evaluate?${qs}`);
}

export async function fetchIntegrations(): Promise<Integration[]> {
  return api.get<Integration[]>('/admin/integrations');
}

export async function bulkImportEmployees(data: { rows: Record<string, string>[] }): Promise<any> {
  return api.post('/admin/import/employees', data);
}
