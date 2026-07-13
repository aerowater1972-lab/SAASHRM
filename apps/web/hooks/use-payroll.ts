'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface PayrollRun {
  id: string;
  name: string;
  status: string;
  period?: string;
  [key: string]: any
}

export interface Payslip {
  id: string;
  netPay: number;
  status: string;
  run?: any
  [key: string]: any
}

export function usePayrollRuns() {
  return useQuery({
    queryKey: queryKeys.payroll.runs,
    queryFn: () => api.get<PayrollRun[]>('/payroll/runs'),
  });
}

export function usePayslips() {
  return useQuery({
    queryKey: queryKeys.payroll.payslips,
    queryFn: () => api.get<Payslip[]>('/payroll/payslips'),
  });
}
