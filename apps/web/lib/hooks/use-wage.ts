import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import * as wageApi from '@/lib/api/wage';
import type { ProvincialMinimumWage, WageListParams } from '@/lib/types';
import type { QueryKey } from '@tanstack/react-query';

export function useProvincialWages(params?: WageListParams) {
  return useQuery<ProvincialMinimumWage[]>({
    queryKey: queryKeys.wage.list(params as Record<string, string | number> | undefined) as QueryKey,
    queryFn: () => wageApi.fetchProvincialWages(params),
  });
}

export function useProvincialWage(id: string) {
  return useQuery<ProvincialMinimumWage>({
    queryKey: queryKeys.wage.detail(id),
    queryFn: () => wageApi.fetchProvincialWage(id),
    enabled: !!id,
  });
}

export function useCreateProvincialWage() {
  const queryClient = useQueryClient();
  return useMutation<ProvincialMinimumWage, Error, Record<string, unknown>>({
    mutationFn: wageApi.createProvincialWage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wage.all });
    },
  });
}

export function useUpdateProvincialWage() {
  const queryClient = useQueryClient();
  return useMutation<ProvincialMinimumWage, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: ({ id, data }) => wageApi.updateProvincialWage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wage.all });
    },
  });
}

export function useDeleteProvincialWage() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: wageApi.deleteProvincialWage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wage.all });
    },
  });
}

export function useWageCalculation(employeeId: string, periodYear?: number) {
  return useQuery<{ employeeId: string; province: string; year: number; minimumWage: number | null; hasProvincialWage: boolean } | null>({
    queryKey: queryKeys.wage.calculation(employeeId, periodYear),
    queryFn: () => wageApi.fetchWageCalculation(employeeId, periodYear),
    enabled: !!employeeId,
  });
}

export function useWageStats(year?: number) {
  return useQuery<{ totalEntries: number; uniqueProvinces: number; averageWage: number; yearRange: { min: number | null; max: number | null } }>({
    queryKey: queryKeys.wage.stats(year),
    queryFn: () => wageApi.fetchWageStats(year),
  });
}