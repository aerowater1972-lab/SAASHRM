import { api } from '@/lib/api';
import type { ExpenseClaim, ExpenseItem, Loan, LoanInstallment } from '@/lib/types';

// ─── Expense Claims ────────────────────────────────────────────────

export async function createExpenseClaim(data: any): Promise<ExpenseClaim> {
  return api.post<ExpenseClaim>('/expense/claims', data);
}

export async function fetchExpenseClaims(params?: { page?: number; limit?: number; q?: string }): Promise<{ data: ExpenseClaim[]; total: number }> {
  const res: any = await api.get('/expense/claims', { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchExpenseClaim(id: string): Promise<ExpenseClaim> {
  return api.get<ExpenseClaim>(`/expense/claims/${id}`);
}

export async function updateExpenseClaim(id: string, data: any): Promise<ExpenseClaim> {
  return api.put<ExpenseClaim>(`/expense/claims/${id}`, data);
}

export async function submitExpenseClaim(id: string): Promise<ExpenseClaim> {
  return api.post<ExpenseClaim>(`/expense/claims/${id}/submit`);
}

export async function approveExpenseClaim(id: string): Promise<ExpenseClaim> {
  return api.put<ExpenseClaim>(`/expense/claims/${id}/approve`);
}

export async function rejectExpenseClaim(id: string): Promise<ExpenseClaim> {
  return api.put<ExpenseClaim>(`/expense/claims/${id}/reject`);
}

export async function payExpenseClaim(id: string): Promise<ExpenseClaim> {
  return api.post<ExpenseClaim>(`/expense/claims/${id}/pay`);
}

export async function getExpenseClaimItems(id: string): Promise<ExpenseItem[]> {
  return api.get<ExpenseItem[]>(`/expense/claims/${id}/items`);
}

export async function addExpenseClaimItem(id: string, data: any): Promise<ExpenseItem> {
  return api.post<ExpenseItem>(`/expense/claims/${id}/items`, data);
}

// ─── Loans ─────────────────────────────────────────────────────────

export async function createLoan(data: any): Promise<Loan> {
  return api.post<Loan>('/expense/loans', data);
}

export async function fetchLoans(params?: { page?: number; limit?: number }): Promise<{ data: Loan[]; total: number }> {
  const res: any = await api.get('/expense/loans', { params });
  return { data: res.data ?? (Array.isArray(res) ? res : []), total: res.total ?? (Array.isArray(res) ? res.length : 0) };
}

export async function fetchLoan(id: string): Promise<Loan> {
  return api.get<Loan>(`/expense/loans/${id}`);
}

export async function approveLoan(id: string): Promise<Loan> {
  return api.put<Loan>(`/expense/loans/${id}/approve`);
}

export async function rejectLoan(id: string): Promise<Loan> {
  return api.put<Loan>(`/expense/loans/${id}/reject`);
}

export async function getLoanInstallments(id: string): Promise<LoanInstallment[]> {
  return api.get<LoanInstallment[]>(`/expense/loans/${id}/installments`);
}

export async function getLoanAmortizationSchedule(id: string): Promise<any> {
  return api.get(`/expense/loans/${id}/amortization-schedule`);
}
