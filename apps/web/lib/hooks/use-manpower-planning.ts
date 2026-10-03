import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchManpowerPlans,
  fetchManpowerPlan,
  createManpowerPlan,
  updateManpowerPlan,
  deleteManpowerPlan,
  submitManpowerPlan,
  approveManpowerPlan,
  linkRequisitionToPlan,
  fetchPlanVsActual,
  fetchCompilation,
  type ManpowerPlanListParams,
} from '@/lib/api/manpower-planning';

export function useManpowerPlans(params?: ManpowerPlanListParams) {
  return useQuery({
    queryKey: queryKeys.manpowerPlans.list(params as Record<string, string>),
    queryFn: () => fetchManpowerPlans(params),
  });
}

export function useManpowerPlan(id: string) {
  return useQuery({
    queryKey: queryKeys.manpowerPlans.detail(id),
    queryFn: () => fetchManpowerPlan(id),
    enabled: !!id,
  });
}

export function useCreateManpowerPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createManpowerPlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.all });
    },
  });
}

export function useUpdateManpowerPlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => updateManpowerPlan(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.all });
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.detail(id) });
    },
  });
}

export function useDeleteManpowerPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteManpowerPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.all });
    },
  });
}

export function useSubmitManpowerPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitManpowerPlan(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.all });
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.detail(id) });
    },
  });
}

export function useApproveManpowerPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => approveManpowerPlan(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.all });
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.detail(id) });
    },
  });
}

export function useLinkRequisitionToPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: Record<string, unknown> }) => linkRequisitionToPlan(planId, data),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.manpowerPlans.detail(planId) });
    },
  });
}

export function usePlanVsActual(params?: ManpowerPlanListParams) {
  return useQuery({
    queryKey: queryKeys.manpowerPlans.planVsActual(params as Record<string, string>),
    queryFn: () => fetchPlanVsActual(params),
  });
}

export function useCompilation(period?: string) {
  return useQuery({
    queryKey: queryKeys.manpowerPlans.compilation(period),
    queryFn: () => fetchCompilation(period),
  });
}
