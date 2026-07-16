import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchExpenseClaims,
  createExpenseClaim,
  fetchExpenseClaim,
  updateExpenseClaim,
  submitExpenseClaim,
  approveExpenseClaim,
  rejectExpenseClaim,
  payExpenseClaim,
  getExpenseClaimItems,
  addExpenseClaimItem,
  fetchLoans,
  createLoan,
  fetchLoan,
  approveLoan,
  rejectLoan,
  getLoanInstallments,
  getLoanAmortizationSchedule,
} from '@/lib/api/expense';

export function useExpenseClaims(params?: { page?: number; limit?: number; q?: string }) {
  return useQuery({ queryKey: ['expense', 'claims', params], queryFn: () => fetchExpenseClaims(params) });
}

export function useExpenseClaim(id: string) {
  return useQuery({ queryKey: ['expense', 'claims', id], queryFn: () => fetchExpenseClaim(id), enabled: !!id });
}

export function useCreateExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createExpenseClaim(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'claims'] }),
  });
}

export function useUpdateExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateExpenseClaim(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'claims'] }),
  });
}

export function useSubmitExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitExpenseClaim(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'claims'] }),
  });
}

export function useApproveExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveExpenseClaim(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'claims'] }),
  });
}

export function useRejectExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectExpenseClaim(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'claims'] }),
  });
}

export function usePayExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payExpenseClaim(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'claims'] }),
  });
}

export function useExpenseClaimItems(id: string) {
  return useQuery({ queryKey: ['expense', 'claims', id, 'items'], queryFn: () => getExpenseClaimItems(id), enabled: !!id });
}

export function useAddExpenseClaimItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => addExpenseClaimItem(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['expense', 'claims', id, 'items'] }),
  });
}

export function useLoans(params?: { page?: number; limit?: number }) {
  return useQuery({ queryKey: ['expense', 'loans', params], queryFn: () => fetchLoans(params) });
}

export function useLoan(id: string) {
  return useQuery({ queryKey: ['expense', 'loans', id], queryFn: () => fetchLoan(id), enabled: !!id });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createLoan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'loans'] }),
  });
}

export function useApproveLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveLoan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'loans'] }),
  });
}

export function useRejectLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectLoan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense', 'loans'] }),
  });
}

export function useLoanInstallments(id: string) {
  return useQuery({ queryKey: ['expense', 'loans', id, 'installments'], queryFn: () => getLoanInstallments(id), enabled: !!id });
}

export function useLoanAmortizationSchedule(id: string) {
  return useQuery({ queryKey: ['expense', 'loans', id, 'amortization-schedule'], queryFn: () => getLoanAmortizationSchedule(id), enabled: !!id });
}
