'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Cycle {
  id: string; name: string; period?: string; status: string;
  startDate?: string; endDate?: string; description?: string;
  createdAt: string;
  reviews: { id: string; status: string; employee: { id: string; fullName: string } }[];
}

export default function CycleDetailPage() {
  const params = useParams(); const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ['cycle', params.id];
  const { data: cycle, error: queryError, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => api.get<Cycle>(`/performance/cycles/${params.id}`),
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  async function handleStart() {
    setActionLoading(true); setActionError('');
    try { await api.post(`/performance/cycles/${params.id}/start`, {}); queryClient.invalidateQueries({ queryKey }); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function handleComplete() {
    setActionLoading(true); setActionError('');
    try { await api.post(`/performance/cycles/${params.id}/complete`, {}); queryClient.invalidateQueries({ queryKey }); }
    catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!cycle) return <p>Not found</p>;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="m-0">{cycle.name}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {cycle.description || ''}{cycle.period ? ` · ${cycle.period}` : ''}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            cycle.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            cycle.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>{cycle.status}</span>
        </div>

        {cycle.status === 'UPCOMING' && (
          <Button onClick={handleStart} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 text-white border-none mt-3">
            {actionLoading ? '…' : 'Start Cycle'}
          </Button>
        )}
        {cycle.status === 'IN_PROGRESS' && (
          <Button onClick={handleComplete} disabled={actionLoading} className="mt-3">
            {actionLoading ? '…' : 'Complete Cycle'}
          </Button>
        )}
      </Card>

      <h3 className="mb-2">Reviews ({cycle.reviews?.length || 0})</h3>
      {cycle.reviews?.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-xs">No reviews.</p>}
      {cycle.reviews?.map((r: any) => (
        <Card key={r.id} className="max-w-[700px] mb-2">
          <div className="text-xs"><strong>{r.employee.fullName}</strong> · {r.status}</div>
        </Card>
      ))}
    </div>
  );
}
