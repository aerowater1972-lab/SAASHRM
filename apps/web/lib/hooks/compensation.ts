import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  fetchReviewCycles,
  fetchReviewCycle,
  createReviewCycle,
  openReviewCycle,
  approveReviewCycle,
  closeReviewCycle,
  createAdjustment,
  bulkAdjustments,
  approveAdjustment,
  rejectAdjustment,
  syncAdjustmentToPayroll,
  fetchEquityAnalysis,
  fetchTotalRewards,
} from '@/lib/api/compensation';

// ===== STRUCTURES =====
export function useSalaryStructures(params?: { jobFamily?: string; grade?: string }) {
  return useQuery({ queryKey: ['compensation', 'structures', params], queryFn: () => fetchSalaryStructures(params) });
}
export function useCreateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createSalaryStructure>[0]) => createSalaryStructure(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'structures'] }),
  });
}
export function useUpdateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateSalaryStructure>[1] }) => updateSalaryStructure(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'structures'] }),
  });
}
export function useDeleteSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSalaryStructure(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'structures'] }),
  });
}

// ===== CYCLES =====
export function useReviewCycles(status?: string) {
  return useQuery({ queryKey: ['compensation', 'cycles', status], queryFn: () => fetchReviewCycles(status) });
}
export function useReviewCycle(id: string) {
  return useQuery({ queryKey: ['compensation', 'cycle', id], queryFn: () => fetchReviewCycle(id), enabled: !!id });
}
export function useCreateReviewCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createReviewCycle>[0]) => createReviewCycle(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'cycles'] }),
  });
}
function cycleAction(fn: (id: string) => Promise<any>) {
  return () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => fn(id),
      onSuccess: (_, id) => {
        qc.invalidateQueries({ queryKey: ['compensation', 'cycles'] });
        qc.invalidateQueries({ queryKey: ['compensation', 'cycle', id] });
      },
    });
  };
}
export const useOpenReviewCycle = cycleAction(openReviewCycle);
export const useApproveReviewCycle = cycleAction(approveReviewCycle);
export const useCloseReviewCycle = cycleAction(closeReviewCycle);

// ===== ADJUSTMENTS =====
export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createAdjustment>[0]) => createAdjustment(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'cycle'] }),
  });
}
export function useBulkAdjustments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof bulkAdjustments>[0]) => bulkAdjustments(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'cycle'] }),
  });
}
function adjustmentAction(fn: (id: string) => Promise<any>) {
  return () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => fn(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'cycle'] }),
    });
  };
}
export const useApproveAdjustment = adjustmentAction(approveAdjustment);
export const useRejectAdjustment = adjustmentAction(rejectAdjustment);
export function useSyncAdjustmentToPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, description }: { id: string; description?: string }) => syncAdjustmentToPayroll(id, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation', 'cycle'] }),
  });
}

// ===== ANALYTICS =====
export function useEquityAnalysis(params?: { jobFamily?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: ['compensation', 'equity', params], queryFn: () => fetchEquityAnalysis(params) });
}
export function useTotalRewards(employeeId: string) {
  return useQuery({ queryKey: ['compensation', 'rewards', employeeId], queryFn: () => fetchTotalRewards(employeeId), enabled: !!employeeId });
}
