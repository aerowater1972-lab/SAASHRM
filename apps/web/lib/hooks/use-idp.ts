import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import * as idpApi from '@/lib/api/idp';
import type { IndividualDevelopmentPlan, IDPActivity, PaginatedResponse } from '@/lib/types';

export function useIDPs() {
  return useQuery<PaginatedResponse<IndividualDevelopmentPlan>, Error>({
    queryKey: queryKeys.idp.all,
    queryFn: () => idpApi.fetchIDPs(),
  });
}

export function useIDP(id: string) {
  return useQuery<IndividualDevelopmentPlan>({
    queryKey: queryKeys.idp.detail(id),
    queryFn: () => idpApi.fetchIDP(id),
    enabled: !!id,
  });
}

export function useCreateIDP() {
  const queryClient = useQueryClient();
  return useMutation<IndividualDevelopmentPlan, Error, Record<string, unknown>>({
    mutationFn: idpApi.createIDP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.idp.all });
    },
  });
}

export function useUpdateIDP() {
  const queryClient = useQueryClient();
  return useMutation<IndividualDevelopmentPlan, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => idpApi.updateIDP(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.idp.all });
    },
  });
}

export function useUpdateIDPStatus() {
  const queryClient = useQueryClient();
  return useMutation<IndividualDevelopmentPlan, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => idpApi.updateIDPStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.idp.detail(variables.id) });
    },
  });
}

export function useAddIDPActivity() {
  const queryClient = useQueryClient();
  return useMutation<IDPActivity, Error, { idpId: string; data: Record<string, unknown> }>({
    mutationFn: ({ idpId, data }) => idpApi.addIDPActivity(idpId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.idp.detail(variables.idpId) });
    },
  });
}

export function useEmployeeIDPSummary(employeeId: string) {
  return useQuery<{ employeeId: string; totalPlans: number; activePlans: number; completedPlans: number; totalActivities: number; completedActivities: number; completionRate: number }>({
    queryKey: queryKeys.idp.employeeSummary(employeeId),
    queryFn: () => idpApi.fetchEmployeeIDPSummary(employeeId),
    enabled: !!employeeId,
  });
}

export function useDeleteIDP() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: idpApi.deleteIDP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.idp.all });
    },
  });
}

export function useTrainingRecommendations(employeeId: string, limit?: number) {
  return useQuery<Record<string, unknown>>({
    queryKey: [...queryKeys.idp.trainingRecommendations(employeeId), limit ?? 5],
    queryFn: () => idpApi.fetchTrainingRecommendations(employeeId, limit),
    enabled: !!employeeId,
  });
}