'use client';

import Link from 'next/link';
import { usePayslips } from '@/hooks/use-payroll';

interface PayslipItem {
  id: string;
  componentId: string;
  amount: number;
  description?: string;
}

interface PayslipRun {
  id: string;
  name: string;
  status: string;
  period?: { id: string; name: string; startDate: string; endDate: string };
}

interface Payslip {
  id: string;
  baseSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  createdAt: string;
  employee: { id: string; employeeId: string; fullName: string };
  run: PayslipRun;
  items: PayslipItem[];
}

export default function PayslipsPage() {
  const { data: payslips = [], isLoading, error } = usePayslips();

  return (
    <div>
      <h2 className="mt-0">Payslips</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error?.message}</div>}
      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && !error && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
              <th className="py-2">Period</th>
              <th>Employee</th>
              <th>Gross Pay</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p: any) => (
              <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5">
                  <Link href={`/payslips/${p.id}`}>{p.run.name || p.run.period?.name || '—'}</Link>
                </td>
                <td>{p.employee.fullName}</td>
                <td>{Number(p.grossPay).toLocaleString('id-ID')}</td>
                <td>{Number(p.totalDeductions).toLocaleString('id-ID')}</td>
                <td><strong>{Number(p.netPay).toLocaleString('id-ID')}</strong></td>
                <td>{p.status}</td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2.5 text-gray-500 dark:text-gray-400">
                  No payslips found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
