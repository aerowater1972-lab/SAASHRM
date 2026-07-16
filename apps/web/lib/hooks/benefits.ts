import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import {
  fetchBenefits,
  fetchBenefit,
  fetchAssets,
  fetchAsset,
  fetchTrainings,
  fetchTraining,
  createTraining,
  updateTraining,
  fetchCertifications,
  fetchResignations,
  fetchResignation,
  createResignation,
  createCertification,
  updateCertification,
  fetchEligibilityRules,
  createEligibilityRule,
  deleteEligibilityRule,
  fetchFinalSettlement,
  createFinalSettlement,
  approveResignation,
  rejectResignation,
  offboardResignation,
  updateResignationTask,
  cancelTraining,
} from '@/lib/api/benefits';
import type { CreateTrainingInput, CreateResignationInput } from '@/lib/schemas/benefits';

export function useTable<T>(queryKey: string[], fetcher: (params: { page: number; limit: number; q?: string }) => Promise<{ data: T[]; total: number }>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const query = useQuery({
    queryKey: [...queryKey, { page, limit, q: search || undefined }],
    queryFn: () => fetcher({ page, limit, q: search || undefined }),
    placeholderData: keepPreviousData,
  });

  return {
    rows: (query.data?.data || []) as T[],
    total: query.data?.total || 0,
    page,
    setPage,
    search,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useBenefits() {
  return useTable<any>(['benefits'], fetchBenefits);
}

export function useBenefit(id: string) {
  return useQuery({
    queryKey: ['benefits', id],
    queryFn: () => fetchBenefit(id),
    enabled: !!id,
  });
}

export function useAssets() {
  return useTable<any>(['assets'], async (params) => {
    const res = await fetchAssets(params);
    return res;
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: () => fetchAsset(id),
    enabled: !!id,
  });
}

export function useTrainings() {
  return useTable<any>(['trainings'], fetchTrainings);
}

export function useTraining(id: string) {
  return useQuery({
    queryKey: ['trainings', id],
    queryFn: () => fetchTraining(id),
    enabled: !!id,
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTrainingInput) => createTraining(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
}

export function useUpdateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTrainingInput> }) => updateTraining(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
}

export function useCertifications() {
  return useTable<any>(['certifications'], fetchCertifications);
}

export function useResignations() {
  return useTable<any>(['resignations'], fetchResignations);
}

export function useResignation(id: string) {
  return useQuery({
    queryKey: ['resignations', id],
    queryFn: () => fetchResignation(id),
    enabled: !!id,
  });
}

export function useCreateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateResignationInput) => createResignation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resignations'] }),
  });
}

export function useCertificationsTable() {
  return useTable<any>(['certifications'], fetchCertifications);
}

export function useCreateCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createCertification(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  });
}

export function useUpdateCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCertification(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  });
}

export function useEligibilityRules() {
  return useQuery({
    queryKey: ['eligibility-rules'],
    queryFn: fetchEligibilityRules,
  });
}

export function useCreateEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { benefitId: string; gradeId?: string; departmentId?: string }) => createEligibilityRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eligibility-rules'] }),
  });
}

export function useDeleteEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEligibilityRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eligibility-rules'] }),
  });
}

export function useFinalSettlement(id: string) {
  return useQuery({
    queryKey: ['resignations', id, 'final-settlement'],
    queryFn: () => fetchFinalSettlement(id),
    enabled: !!id,
  });
}

export function useCreateFinalSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => createFinalSettlement(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resignations'] }),
  });
}

export function useApproveResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveResignation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resignations'] }),
  });
}

export function useRejectResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectResignation(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resignations'] }),
  });
}

export function useOffboardResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => offboardResignation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resignations'] }),
  });
}

export function useUpdateResignationTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, taskId }: { id: string; taskId: string }) => updateResignationTask(id, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resignations'] }),
  });
}

export function useCancelTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelTraining(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
}
