'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { decodeToken } from '@/lib/api';
import { usePayslip, useAcknowledgePayslip } from '@/lib/hooks/payroll';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, User, DollarSign, CalendarDays, Building2 } from 'lucide-react';

interface PayslipItem { id: string; componentId: string; amount: number; description?: string }
interface PayslipRun { id: string; name: string; status: string; period?: { id: string; name: string; startDate: string; endDate: string } }
interface Employment { department?: { name: string }; position?: { name: string }; grade?: { name: string } }
interface Payslip {
  id: string; baseSalary: number; grossPay: number; totalDeductions: number; netPay: number;
  bankTransferCode?: string; status: string; createdAt: string;
  employee: { id: string; employeeId: string; fullName: string; employments?: Employment[] };
  run: PayslipRun; items: PayslipItem[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive' | 'info'> = {
  DRAFT: 'secondary', PUBLISHED: 'success', ACKNOWLEDGED: 'info', DISPUTED: 'destructive', PAID: 'info',
};

export default function PayslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [acknowledging, setAcknowledging] = useState(false);
  const [ackError, setAckError] = useState('');
  const acknowledgePayslip = useAcknowledgePayslip();

  const { data: payslip, isLoading, error, refetch } = usePayslip(params.id as string);

  async function handleAcknowledge() {
    setAcknowledging(true); setAckError('');
    try {
      const empId = decodeToken()?.employeeId;
      await acknowledgePayslip.mutateAsync({ id: params.id as string, employeeId: empId });
      refetch();
    } catch (e: any) { setAckError(e.message); }
    finally { setAcknowledging(false); }
  }

  if (isLoading) return <PageSkeleton />;
  if (error || !payslip) return <ErrorState message={error instanceof Error ? error.message : 'Data tidak ditemukan'} onRetry={() => refetch()} />;

  const emp = payslip.employee;
  const activeEmployment = emp?.employments?.find((e: any) => e.department || e.position);
  const period = payslip.run?.period;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Slip Gaji</h1>
          <p className="text-sm text-muted-foreground">{payslip.run?.name}{period ? ` — ${new Date(period.startDate).toLocaleDateString('id-ID')} - ${new Date(period.endDate).toLocaleDateString('id-ID')}` : ''}</p>
        </div>
        <Badge variant={(statusVariant[payslip.status] || 'secondary') as any} className="ml-auto">{payslip.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Karyawan</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p className="font-medium">{emp?.fullName}</p><p className="text-xs text-muted-foreground">{emp?.employeeId}</p></div></div>
            {activeEmployment?.position?.name && <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{activeEmployment.position.name}{activeEmployment.department?.name ? ` · ${activeEmployment.department.name}` : ''}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ringkasan</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Base Salary</span><span>Rp {Number(payslip.baseSalary).toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gross Pay</span><span>Rp {Number(payslip.grossPay).toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Deductions</span><span className="text-destructive">- Rp {Number(payslip.totalDeductions).toLocaleString('id-ID')}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Net Pay</span><span>Rp {Number(payslip.netPay).toLocaleString('id-ID')}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Komponen Gaji</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium">Component</th>
                  <th className="py-2 px-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payslip.items?.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="py-2 px-3">{item.description || item.componentId}</td>
                    <td className="py-2 px-3 text-right font-mono">Rp {Number(item.amount).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {payslip.bankTransferCode && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Transfer Bank</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Kode: {payslip.bankTransferCode}</p></CardContent>
        </Card>
      )}

      {ackError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{ackError}</div>}

      {payslip.status !== 'PAID' && (
        <Button onClick={handleAcknowledge} disabled={acknowledging} className="bg-green-600 hover:bg-green-700">
          {acknowledging ? 'Memproses…' : 'Acknowledge & Confirm Receipt'}
        </Button>
      )}
    </div>
  );
}
