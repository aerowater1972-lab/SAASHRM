import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import * as successionApi from '@/lib/api/succession';
import type {
  TalentPool,
  PoolMember,
  SuccessionPlan,
  SuccessionCandidate,
  SuccessionSummary,
  TalentPoolListParams,
  SuccessionPlanListParams,
} from '@/lib/api/succession';

export function useSuccessionSummary() {
  return useQuery<SuccessionSummary, Error>({
    queryKey: queryKeys.succession.summary,
    queryFn: successionApi.fetchSuccessionSummary,
  });
}

export function useTalentPools(params?: TalentPoolListParams) {
  return useQuery<TalentPool[], Error>({
    queryKey: queryKeys.succession.pools,
    queryFn: () => successionApi.fetchTalentPools(params),
  });
}

export function useTalentPool(id: string) {
  return useQuery<TalentPool & { members: PoolMember[] }, Error>({
    queryKey: queryKeys.succession.poolDetail(id),
    queryFn: () => successionApi.fetchTalentPool(id),
    enabled: !!id,
  });
}

export function useCreateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation<TalentPool, Error, Record<string, unknown>>({
    mutationFn: successionApi.createTalentPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.pools });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useUpdateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation<TalentPool, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => successionApi.updateTalentPool(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.poolDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.pools });
    },
  });
}

export function useDeleteTalentPool() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: successionApi.deleteTalentPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.pools });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useAddPoolMember() {
  const queryClient = useQueryClient();
  return useMutation<PoolMember, Error, { poolId: string; data: Record<string, unknown> }>({
    mutationFn: ({ poolId, data }) => successionApi.addPoolMember(poolId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.poolDetail(variables.poolId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useUpdatePoolMember() {
  const queryClient = useQueryClient();
  return useMutation<PoolMember, Error, { poolId: string; employeeId: string; data: Record<string, unknown> }>({
    mutationFn: ({ poolId, employeeId, data }) => successionApi.updatePoolMember(poolId, employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.poolDetail(variables.poolId) });
    },
  });
}

export function useRemovePoolMember() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { poolId: string; employeeId: string }>({
    mutationFn: ({ poolId, employeeId }) => successionApi.removePoolMember(poolId, employeeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.poolDetail(variables.poolId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useSuccessionPlans(params?: SuccessionPlanListParams) {
  return useQuery<SuccessionPlan[], Error>({
    queryKey: queryKeys.succession.plans,
    queryFn: () => successionApi.fetchSuccessionPlans(params),
  });
}

export function useSuccessionPlan(id: string) {
  return useQuery<SuccessionPlan & { candidates: SuccessionCandidate[] }, Error>({
    queryKey: queryKeys.succession.planDetail(id),
    queryFn: () => successionApi.fetchSuccessionPlan(id),
    enabled: !!id,
  });
}

export function useCreateSuccessionPlan() {
  const queryClient = useQueryClient();
  return useMutation<SuccessionPlan, Error, Record<string, unknown>>({
    mutationFn: successionApi.createSuccessionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.plans });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useUpdateSuccessionPlan() {
  const queryClient = useQueryClient();
  return useMutation<SuccessionPlan, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => successionApi.updateSuccessionPlan(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.planDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.plans });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useDeleteSuccessionPlan() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: successionApi.deleteSuccessionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.plans });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useAddSuccessionCandidate() {
  const queryClient = useQueryClient();
  return useMutation<SuccessionCandidate, Error, { planId: string; data: Record<string, unknown> }>({
    mutationFn: ({ planId, data }) => successionApi.addSuccessionCandidate(planId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.planDetail(variables.planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useUpdateSuccessionCandidate() {
  const queryClient = useQueryClient();
  return useMutation<SuccessionCandidate, Error, { planId: string; candidateId: string; data: Record<string, unknown> }>({
    mutationFn: ({ planId, candidateId, data }) => successionApi.updateSuccessionCandidate(planId, candidateId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.planDetail(variables.planId) });
    },
  });
}

export function useRemoveSuccessionCandidate() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { planId: string; candidateId: string }>({
    mutationFn: ({ planId, candidateId }) => successionApi.removeSuccessionCandidate(planId, candidateId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.planDetail(variables.planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.succession.summary });
    },
  });
}

export function useNineBoxMatrix(poolId?: string) {
  return useQuery<successionApi.NineBoxMatrix, Error>({
    queryKey: queryKeys.succession.nineBox(poolId),
    queryFn: () => successionApi.fetchNineBoxMatrix(poolId),
  });
}