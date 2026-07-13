'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: any[]
  [key: string]: any;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  [key: string]: any;
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  changedBy: string;
  changedAt: string;
  [key: string]: any;
}

export interface Workflow {
  id: string;
  name: string;
  status: string;
  states: any[]
  transitions: any[]
  [key: string]: any;
}

export interface FeatureFlag {
  id: string;
  key: string;
  feature: string;
  module: string;
  enabled: boolean;
  [key: string]: any
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  provider?: string;
  status: string;
  lastSyncAt?: string;
  errorMessage?: string;
  [key: string]: any
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.admin.roles,
    queryFn: () => api.get<Role[]>('/admin/roles'),
  });
}

export function useTenants() {
  return useQuery({
    queryKey: queryKeys.admin.tenants,
    queryFn: () => api.get<Tenant[]>('/admin/tenants'),
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.admin.auditLogs,
    queryFn: () => api.get<AuditLog[]>('/admin/audit-logs'),
  });
}

export function useWorkflows() {
  return useQuery({
    queryKey: queryKeys.admin.workflows,
    queryFn: () => api.get<Workflow[]>('/admin/workflows'),
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.admin.featureFlags,
    queryFn: () => api.get<FeatureFlag[]>('/admin/feature-flags'),
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: queryKeys.admin.integrations,
    queryFn: () => api.get<Integration[]>('/admin/integrations'),
  });
}
