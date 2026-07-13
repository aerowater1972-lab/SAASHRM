'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';

export default function NewGoalPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', description: '', metric: '', targetValue: '',
    startDate: '', endDate: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const result = await api.post<any>('/performance/goals', {
        title: form.title,
        description: form.description || undefined,
        metric: form.metric || undefined,
        targetValue: form.targetValue ? Number(form.targetValue) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      router.push(`/goals/${result.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 className="mt-0">New Goal</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card className="max-w-[500px]">
          <Input label="Title *" type="text" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
            <textarea rows={3} value={form.description}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Input label="Metric (e.g. &quot;Sales calls&quot;, &quot;Code reviews&quot;)" type="text" value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value })} />
          <Input label="Target Value" type="number" min={0} value={form.targetValue}
            onChange={(e) => setForm({ ...form, targetValue: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create Goal'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
