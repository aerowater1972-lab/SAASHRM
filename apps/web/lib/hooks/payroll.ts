import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPeriods,
  createPeriod,
  fetchPeriod,
  updatePeriod,
  closePeriod,
  lockPeriod,
  fetchRuns,
  createRun,
  fetchRun,
  processRun,
  approveRun,
  publishRun,
  fetchRunSummary,
  generateRunPayslips,
  generateRunBankTransfer,
  fetchPayrollComponents,
  createPayrollComponent,
  fetchPayrollComponent,
  updatePayrollComponent,
  deletePayrollComponent,
  fetchPayslips,
  fetchPayslip,
  generatePayslipPdf,
  acknowledgePayslip,
  fetchSalaryComponents,
  createSalaryComponent,
  fetchSalaryComponent,
  fetchBankTransferBatches,
  fetchBankTransferBatch,
  fetchTaxConfigs,
  createTaxConfig,
  updateTaxConfig,
  calculateTax,
  fetchBpjsConfigs,
  createBpjsConfig,
  updateBpjsConfig,
  calculateBpjs,
  generateBpjsReport,
  type PeriodListParams,
  type RunListParams,
  type PayslipListParams,
  type SalaryComponentListParams,
} from '@/lib/api/payroll';

export function usePeriods(params?: PeriodListParams) {
  return useQuery({ queryKey: ['payroll', 'periods', params], queryFn: () => fetchPeriods(params) });
}

export function usePeriod(id: string) {
  return useQuery({ queryKey: ['payroll', 'periods', id], queryFn: () => fetchPeriod(id), enabled: !!id });
}

export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createPeriod(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'periods'] }),
  });
}

export function useUpdatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updatePeriod(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'periods'] }),
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closePeriod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'periods'] }),
  });
}

export function useLockPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lockPeriod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'periods'] }),
  });
}

export function useRuns(params?: RunListParams) {
  return useQuery({ queryKey: ['payroll', 'runs', params], queryFn: () => fetchRuns(params) });
}

export function useRun(id: string) {
  return useQuery({ queryKey: ['payroll', 'runs', id], queryFn: () => fetchRun(id), enabled: !!id });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createRun(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
  });
}

export function useProcessRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
  });
}

export function useApproveRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
  });
}

export function usePublishRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
  });
}

export function useRunSummary(id: string) {
  return useQuery({ queryKey: ['payroll', 'runs', id, 'summary'], queryFn: () => fetchRunSummary(id), enabled: !!id });
}

export function useGenerateRunPayslips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => generateRunPayslips(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
  });
}

export function useGenerateRunBankTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => generateRunBankTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
  });
}

export function usePayrollComponents() {
  return useQuery({ queryKey: ['payroll', 'components'], queryFn: fetchPayrollComponents });
}

export function usePayrollComponent(id: string) {
  return useQuery({ queryKey: ['payroll', 'components', id], queryFn: () => fetchPayrollComponent(id), enabled: !!id });
}

export function useCreatePayrollComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createPayrollComponent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'components'] }),
  });
}

export function useUpdatePayrollComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updatePayrollComponent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'components'] }),
  });
}

export function useDeletePayrollComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePayrollComponent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'components'] }),
  });
}

export function usePayslips(params?: PayslipListParams) {
  return useQuery({ queryKey: ['payroll', 'payslips', params], queryFn: () => fetchPayslips(params) });
}

export function usePayslip(id: string) {
  return useQuery({ queryKey: ['payroll', 'payslips', id], queryFn: () => fetchPayslip(id), enabled: !!id });
}

export function useGeneratePayslipPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => generatePayslipPdf(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'payslips'] }),
  });
}

export function useAcknowledgePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId?: string }) => acknowledgePayslip(id, employeeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'payslips'] }),
  });
}

export function useSalaryComponents(params?: SalaryComponentListParams) {
  return useQuery({ queryKey: ['payroll', 'salary-components', params], queryFn: () => fetchSalaryComponents(params) });
}

export function useSalaryComponent(id: string) {
  return useQuery({ queryKey: ['payroll', 'salary-components', id], queryFn: () => fetchSalaryComponent(id), enabled: !!id });
}

export function useCreateSalaryComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createSalaryComponent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'salary-components'] }),
  });
}

export function useBankTransferBatches() {
  return useQuery({ queryKey: ['payroll', 'bank-transfers'], queryFn: fetchBankTransferBatches });
}

export function useBankTransferBatch(id: string) {
  return useQuery({ queryKey: ['payroll', 'bank-transfers', id], queryFn: () => fetchBankTransferBatch(id), enabled: !!id });
}

export function useTaxConfigs() {
  return useQuery({ queryKey: ['payroll', 'tax-configs'], queryFn: fetchTaxConfigs });
}

export function useCreateTaxConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createTaxConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'tax-configs'] }),
  });
}

export function useUpdateTaxConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateTaxConfig(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'tax-configs'] }),
  });
}

export function useCalculateTax() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => calculateTax(data),
  });
}

export function useBpjsConfigs() {
  return useQuery({ queryKey: ['payroll', 'bpjs-configs'], queryFn: fetchBpjsConfigs });
}

export function useCreateBpjsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createBpjsConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'bpjs-configs'] }),
  });
}

export function useUpdateBpjsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateBpjsConfig(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'bpjs-configs'] }),
  });
}

export function useCalculateBpjs() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => calculateBpjs(data),
  });
}

export function useGenerateBpjsReport() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => generateBpjsReport(data),
  });
}
