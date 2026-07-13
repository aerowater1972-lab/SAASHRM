'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Goal {
  id: string;
  title: string;
  description?: string;
  metric?: string;
  targetValue?: number;
  actualValue?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt: string;
  employee: { id: string; fullName: string; employeeId: string };
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ['goal', params.id];
  const { data: goal, error: queryError, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => api.get<Goal>(`/performance/goals/${params.id}`),
  });
  const [updating, setUpdating] = useState(false);
  const [progressInput, setProgressInput] = useState('');
  const [actionError, setActionError] = useState('');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  useEffect(() => {
    if (goal) setProgressInput(String(goal.actualValue ?? 0));
  }, [goal]);

  async function handleUpdateProgress() {
    setUpdating(true); setActionError('');
    try {
      await api.put(`/performance/goals/${params.id}/progress`, {
        actualValue: Number(progressInput),
      });
      queryClient.invalidateQueries({ queryKey });
    } catch (e: any) { setActionError(e.message); }
    finally { setUpdating(false); }
  }

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error}</div>;
  if (!goal) return <p>Not found</p>;

  const pct = goal.targetValue && goal.targetValue > 0
    ? Math.min(100, Math.round(((goal.actualValue || 0) / goal.targetValue) * 100)) : 0;

  return (
    <div>
      <Button variant="secondary" onClick={() => router.back()} className="mb-4">← Back</Button>

      <Card className="max-w-[600px] mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="m-0">{goal.title}</h3>
            <p className="m-1 text-gray-500 dark:text-gray-400 text-xs">
              {goal.employee.fullName} · {goal.employee.employeeId}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            goal.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            goal.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {goal.status}
          </span>
        </div>

        {goal.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{goal.description}</p>
        )}

        <div className="flex gap-6 mb-5 text-xs">
          <div><strong>Metric</strong><br />{goal.metric || '—'}</div>
          <div><strong>Target</strong><br />{goal.targetValue ?? '—'}</div>
          <div><strong>Actual</strong><br />{goal.actualValue ?? 0}</div>
          <div><strong>Progress</strong><br />{pct}%</div>
          <div><strong>Period</strong><br />{goal.startDate ? new Date(goal.startDate).toLocaleDateString('id-ID') : '—'} – {goal.endDate ? new Date(goal.endDate).toLocaleDateString('id-ID') : '—'}</div>
        </div>

        <div className="mb-5">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
            <div className={`h-full rounded-full transition-all duration-300 ${
              pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
            }`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
            {goal.actualValue ?? 0} / {goal.targetValue ?? '—'}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Update Progress</label>
            <input type="number" min={0} value={progressInput}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              onChange={(e) => setProgressInput(e.target.value)} />
          </div>
          <Button onClick={handleUpdateProgress} disabled={updating}>
            {updating ? 'Saving…' : 'Update'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
