'use client';

import Link from 'next/link';
import { usePayslips } from '@/lib/hooks/payroll';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { FileText } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive' | 'info'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  ACKNOWLEDGED: 'info',
  DISPUTED: 'destructive',
};

export default function PayslipsPage() {
  const { data, isLoading, error, refetch } = usePayslips();
  const payslips = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Slip Gaji</h1>
        <p className="text-sm text-muted-foreground">Lihat riwayat slip gaji karyawan</p>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={6} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && payslips.length === 0 && (
        <EmptyState
          title="Belum ada slip gaji"
          description="Slip gaji akan muncul setelah payroll diproses."
        />
      )}

      {!isLoading && !error && payslips.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead className="text-right">Gaji Bruto</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Gaji Bersih</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/payslips/${p.id}`} className="font-medium text-primary hover:underline">
                      {p.run?.name || p.run?.period?.name || '—'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.employee?.fullName || '—'}</TableCell>
                  <TableCell className="text-right font-mono">
                    Rp {Number(p.grossPay).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    Rp {Number(p.totalDeductions).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    Rp {Number(p.netPay).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(statusVariant[p.status] || 'secondary') as any}>{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
