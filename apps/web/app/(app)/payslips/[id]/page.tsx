'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { decodeToken } from '@/lib/api';
import { Button, Card } from '@/components/ui';

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

interface Employment {
  department?: { name: string };
  position?: { name: string };
  grade?: { name: string };
}

interface Payslip {
  id: string;
  baseSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  bankTransferCode?: string;
  status: string;
  createdAt: string;
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    employments?: Employment[];
  };
  run: PayslipRun;
  items: PayslipItem[];
}

export default function PayslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [acknowledging, setAcknowledging] = useState(false);
  const [ackError, setAckError] = useState('');

  const { data: payslip, isLoading, error } = useQuery({
    queryKey: ['payslip', params.id],
    queryFn: () => api.get<Payslip>(`/payroll/payslips/${params.id}`),
  });

  async function handleAcknowledge() {
    setAcknowledging(true); setAckError('');
    try {
      const empId = decodeToken()?.employeeId;
      await api.put(`/payroll/payslips/${params.id}/acknowledge?employeeId=${empId}`, {});
    } catch (e: any) {
      setAckError(e.message);
    } finally {
      setAcknowledging(false);
    }
  }

  if (isLoading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error?.message}</div>;
  if (!payslip) return <p>Not found</p>;

  const emp = payslip.employee;
  const activeEmployment = emp.employments?.find((e: any) => e.department || e.position);
  const period = payslip.run.period;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">
        ← Back
      </Button>

      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="m-0">Payslip</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {payslip.run.name} — {period ? `${new Date(period.startDate).toLocaleDateString('id-ID')} - ${new Date(period.endDate).toLocaleDateString('id-ID')}` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              Rp {Number(payslip.netPay).toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Net Pay</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div>
            <strong>Employee</strong><br />
            {emp.fullName} ({emp.employeeId})<br />
            {activeEmployment?.position?.name && <>{activeEmployment.position.name}<br /></>}
            {activeEmployment?.department?.name && <>{activeEmployment.department.name}<br /></>}
          </div>
          <div>
            <strong>Status</strong><br />
            {payslip.status}<br />
            {payslip.bankTransferCode && <>Transfer: {payslip.bankTransferCode}</>}
          </div>
        </div>

        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="py-2">Component</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payslip.items.map((item: any) => (
              <tr key={item.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2">{item.description || item.componentId}</td>
                <td className="text-right">Rp {Number(item.amount).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-3 text-sm">
          <div className="flex justify-between">
            <span>Base Salary</span>
            <span>Rp {Number(payslip.baseSalary).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span>Gross Pay</span>
            <span>Rp {Number(payslip.grossPay).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>Total Deductions</span>
            <span>- Rp {Number(payslip.totalDeductions).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-bold text-base mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
            <span>Net Pay</span>
            <span>Rp {Number(payslip.netPay).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </Card>

      {ackError && <div className="text-red-500 text-sm mb-3">{ackError}</div>}
      {payslip.status !== 'PAID' && (
        <Button
          onClick={handleAcknowledge}
          disabled={acknowledging}
          className="bg-green-600 hover:bg-green-700 text-white border-none"
        >
          {acknowledging ? 'Processing…' : 'Acknowledge & Confirm Receipt'}
        </Button>
      )}
    </div>
  );
}
