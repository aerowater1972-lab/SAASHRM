import { api } from '@/lib/api';
import type {
  PayrollPeriod,
  PayrollRun,
  Payslip,
  PayrollComponent,
  BpjsConfig,
  TaxConfig,
  PaginatedResponse,
} from '@/lib/types';

export interface SalaryComponent {
  id: string;
  employeeId: string;
  componentType: string;
  amount: number;
  effectiveDate: string;
  endDate?: string;
  createdAt: string;
}

export interface BankTransferBatch {
  id: string;
  payrollRunId: string;
  bankCode: string;
  fileUrl: string;
  status: string;
  generatedAt: string;
  run?: PayrollRun;
}

export interface PeriodListParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface RunListParams {
  page?: number;
  limit?: number;
}

export interface PayslipListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  runId?: string;
}

export interface SalaryComponentListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  componentType?: string;
}

export async function createPeriod(data: Record<string, unknown>): Promise<PayrollPeriod> {
  return api.post<PayrollPeriod>('/payroll/periods', data);
}

export async function fetchPeriods(params?: PeriodListParams): Promise<PaginatedResponse<PayrollPeriod>> {
  return api.get<PaginatedResponse<PayrollPeriod>>('/payroll/periods', { params: params as Record<string, unknown> });
}

export async function fetchPeriod(id: string): Promise<PayrollPeriod> {
  return api.get<PayrollPeriod>(`/payroll/periods/${id}`);
}

export async function updatePeriod(id: string, data: Record<string, unknown>): Promise<PayrollPeriod> {
  return api.put<PayrollPeriod>(`/payroll/periods/${id}`, data);
}

export async function closePeriod(id: string): Promise<PayrollPeriod> {
  return api.post<PayrollPeriod>(`/payroll/periods/${id}/close`);
}

export async function lockPeriod(id: string): Promise<PayrollPeriod> {
  return api.post<PayrollPeriod>(`/payroll/periods/${id}/lock`);
}

export async function createRun(data: Record<string, unknown>): Promise<PayrollRun> {
  return api.post<PayrollRun>('/payroll/runs', data);
}

export async function fetchRuns(params?: RunListParams): Promise<PaginatedResponse<PayrollRun>> {
  return api.get<PaginatedResponse<PayrollRun>>('/payroll/runs', { params: params as Record<string, unknown> });
}

export async function fetchRun(id: string): Promise<PayrollRun> {
  return api.get<PayrollRun>(`/payroll/runs/${id}`);
}

export async function processRun(id: string): Promise<PayrollRun> {
  return api.post<PayrollRun>(`/payroll/runs/${id}/process`);
}

export async function approveRun(id: string): Promise<PayrollRun> {
  return api.post<PayrollRun>(`/payroll/runs/${id}/approve`);
}

export async function publishRun(id: string): Promise<PayrollRun> {
  return api.post<PayrollRun>(`/payroll/runs/${id}/publish`);
}

export async function fetchRunSummary(id: string): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(`/payroll/runs/${id}/summary`);
}

export async function generateRunPayslips(id: string): Promise<PayrollRun> {
  return api.post<PayrollRun>(`/payroll/runs/${id}/generate-payslips`);
}

export async function generateRunBankTransfer(id: string, bank?: string): Promise<BankTransferBatch> {
  return api.post<BankTransferBatch>(`/payroll/runs/${id}/generate-bank-transfer`, undefined, {
    params: (bank ? { bank } : {}) as Record<string, unknown>,
  });
}

export async function createPayrollComponent(data: Record<string, unknown>): Promise<PayrollComponent> {
  return api.post<PayrollComponent>('/payroll/components', data);
}

export async function fetchPayrollComponents(): Promise<PayrollComponent[]> {
  return api.get<PayrollComponent[]>('/payroll/components');
}

export async function fetchPayrollComponent(id: string): Promise<PayrollComponent> {
  return api.get<PayrollComponent>(`/payroll/components/${id}`);
}

export async function updatePayrollComponent(id: string, data: Record<string, unknown>): Promise<PayrollComponent> {
  return api.put<PayrollComponent>(`/payroll/components/${id}`, data);
}

export async function deletePayrollComponent(id: string): Promise<void> {
  await api.delete(`/payroll/components/${id}`);
}

export async function fetchPayslips(params?: PayslipListParams): Promise<PaginatedResponse<Payslip>> {
  return api.get<PaginatedResponse<Payslip>>('/payroll/payslips', { params: params as Record<string, unknown> });
}

export async function fetchPayslip(id: string): Promise<Payslip> {
  return api.get<Payslip>(`/payroll/payslips/${id}`);
}

export async function generatePayslipPdf(id: string): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(`/payroll/payslips/${id}/pdf`);
}

export async function acknowledgePayslip(id: string, employeeId?: string): Promise<Payslip> {
  return api.put<Payslip>(`/payroll/payslips/${id}/acknowledge`, undefined, { params: { employeeId } as Record<string, unknown> });
}

export async function createSalaryComponent(data: Record<string, unknown>): Promise<SalaryComponent> {
  return api.post<SalaryComponent>('/payroll/salary-components', data);
}

export async function fetchSalaryComponents(params?: SalaryComponentListParams): Promise<PaginatedResponse<SalaryComponent>> {
  return api.get<PaginatedResponse<SalaryComponent>>('/payroll/salary-components', { params: params as Record<string, unknown> });
}

export async function fetchSalaryComponent(id: string): Promise<SalaryComponent> {
  return api.get<SalaryComponent>(`/payroll/salary-components/${id}`);
}

export async function fetchBankTransferBatches(): Promise<BankTransferBatch[]> {
  return api.get<BankTransferBatch[]>('/payroll/bank-transfers');
}

export async function fetchBankTransferBatch(id: string): Promise<BankTransferBatch> {
  return api.get<BankTransferBatch>(`/payroll/bank-transfers/${id}`);
}

export async function createTaxConfig(data: Record<string, unknown>): Promise<TaxConfig> {
  return api.post<TaxConfig>('/payroll/tax/configs', data);
}

export async function fetchTaxConfigs(): Promise<TaxConfig[]> {
  return api.get<TaxConfig[]>('/payroll/tax/configs');
}

export async function updateTaxConfig(id: string, data: Record<string, unknown>): Promise<TaxConfig> {
  return api.put<TaxConfig>(`/payroll/tax/configs/${id}`, data);
}

export async function calculateTax(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/payroll/tax/calculate', data);
}

export async function createBpjsConfig(data: Record<string, unknown>): Promise<BpjsConfig> {
  return api.post<BpjsConfig>('/payroll/bpjs/configs', data);
}

export async function fetchBpjsConfigs(): Promise<BpjsConfig[]> {
  return api.get<BpjsConfig[]>('/payroll/bpjs/configs');
}

export async function updateBpjsConfig(id: string, data: Record<string, unknown>): Promise<BpjsConfig> {
  return api.put<BpjsConfig>(`/payroll/bpjs/configs/${id}`, data);
}

export async function calculateBpjs(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/payroll/bpjs/calculate', data);
}

export async function generateBpjsReport(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/payroll/bpjs/report', data);
}

export async function fetchMonthlyIuran(params: {
  employeeId: string;
  month?: number;
  year?: number;
}): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/payroll/bpjs/monthly-iuran', {
    params: params as Record<string, unknown>,
  });
}
