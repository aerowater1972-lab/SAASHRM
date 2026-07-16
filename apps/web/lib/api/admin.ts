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
  await api.post('/admin/permissions/assign', data);
}

export async function removePermission(roleId: string, permissionId: string): Promise<void> {
  await api.delete(`/admin/roles/${roleId}/permissions/${permissionId}`);
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

export async function fetchUsers(): Promise<User[]> {
  return api.get<User[]>('/admin/users');
}

export async function createUser(data: CreateUserInput): Promise<User> {
  return api.post<User>('/admin/users', data);
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  return api.get<AuditLog[]>('/admin/audit-logs');
}

export async function fetchWorkflows(): Promise<WorkflowDefinition[]> {
  return api.get<WorkflowDefinition[]>('/admin/workflows');
}

export async function createWorkflow(data: CreateWorkflowInput): Promise<WorkflowDefinition> {
  return api.post<WorkflowDefinition>('/admin/workflows', data);
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  return api.get<FeatureFlag[]>('/admin/feature-flags');
}

export async function toggleFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag> {
  return api.put<FeatureFlag>(`/admin/feature-flags/${id}`, { enabled });
}

export async function fetchIntegrations(): Promise<Integration[]> {
  return api.get<Integration[]>('/admin/integrations');
}
