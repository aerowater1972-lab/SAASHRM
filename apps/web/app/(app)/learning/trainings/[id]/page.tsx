'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Participant { id: string; employeeId: string; fullName?: string; status: string; score?: number; }

interface TrainingDetail {
  id: string; title: string; description?: string; type: string;
  startDate: string; endDate: string; status: string; maxParticipants?: number;
  participants: Participant[];
}

export default function TrainingDetailPage() {
  const params = useParams(); const router = useRouter();
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['training', params.id],
    queryFn: () => api.get<TrainingDetail>(`/learning/trainings/${params.id}`),
  });

  async function handleCancel() {
    if (!confirm('Cancel this training?')) return;
    try { await api.post(`/learning/trainings/${params.id}/cancel`, {}); }
    catch (e: any) { setActionError(e.message); }
  }

  if (isLoading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error?.message}</div>;
  if (!data) return <p>Not found</p>;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>
      {actionError && <div className="text-red-500 text-sm mb-3">{actionError}</div>}
      <Card className="max-w-[700px] mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="m-0">{data.title}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {data.type} · {new Date(data.startDate).toLocaleDateString('id-ID')} – {new Date(data.endDate).toLocaleDateString('id-ID')}
              {data.maxParticipants ? ` · Max: ${data.maxParticipants}` : ''}
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{data.status}</span>
        </div>
        {data.description && <p className="text-xs">{data.description}</p>}
        {data.status === 'ACTIVE' && (
          <Button variant="danger" className="mt-3" onClick={handleCancel}>Cancel Training</Button>
        )}
      </Card>

      <h3 className="mb-3">Participants ({data.participants.length})</h3>
      <table className="w-full border-collapse">
        <thead><tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
          <th className="py-2">Employee</th><th>Status</th><th>Score</th>
        </tr></thead>
        <tbody>
          {data.participants.map((p: any) => (
            <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700">
              <td className="py-2.5">{p.fullName || p.employeeId}</td>
              <td>{p.status}</td>
              <td>{p.score != null ? Number(p.score).toFixed(1) : '—'}</td>
            </tr>
          ))}
          {data.participants.length === 0 && <tr><td colSpan={3} className="text-gray-500 dark:text-gray-400 py-2.5">No participants.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
