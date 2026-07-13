'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface EmployeeBenefit {
  id: string;
  status: string;
  effectiveDate?: string;
  employee: { id: string; employeeId: string; fullName: string };
}

interface Benefit {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  amount?: number;
  isActive: boolean;
  createdAt: string;
  employeeBenefits: EmployeeBenefit[];
}

export default function BenefitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: benefit, error: queryError, isLoading: loading } = useQuery({
    queryKey: ['benefit', params.id],
    queryFn: () => api.get<Benefit>(`/benefits/${params.id}`),
  });
  const error = queryError instanceof Error ? queryError.message : '';

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!benefit) return <p>Not found</p>;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-2xl mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="m-0">{benefit.name}</h3>
            <p className="m-1 text-gray-400 text-xs">
              {benefit.code} · {benefit.type}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${benefit.isActive ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {benefit.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {benefit.description && <p className="text-sm mb-3">{benefit.description}</p>}
        {benefit.amount && (
          <p className="text-base font-semibold">Rp {Number(benefit.amount).toLocaleString('id-ID')}</p>
        )}
      </Card>

      <h3 className="mb-2">Enrolled Employees ({benefit.employeeBenefits.length})</h3>
      {benefit.employeeBenefits.length === 0 && <p className="text-gray-400 text-xs">No enrollments.</p>}
      {benefit.employeeBenefits.map((eb: any) => (
        <Card key={eb.id} className="max-w-2xl mb-2">
          <div className="flex justify-between text-xs">
            <div><strong>{eb.employee.fullName}</strong> · {eb.employee.employeeId}</div>
            <div>{eb.status}{eb.effectiveDate ? ` · ${new Date(eb.effectiveDate).toLocaleDateString('id-ID')}` : ''}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
