'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateResignation } from '@/hooks/use-resignations';
import { Button, Card, Input } from '@/components/ui';

const types = ['RESIGNATION', 'RETIREMENT', 'TERMINATION', 'END_OF_CONTRACT'];

export default function NewResignationPage() {
  const router = useRouter();
  const [form, setForm] = useState({ type: 'RESIGNATION', reason: '', resignationDate: '', effectiveDate: '' });
  const [error, setError] = useState('');
  const createResignation = useCreateResignation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const result = await createResignation.mutateAsync({
        type: form.type,
        reason: form.reason,
        resignationDate: form.resignationDate,
        effectiveDate: form.effectiveDate,
      });
      router.push(`/resignations/${result.id}`);
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <h2 className="mt-0">New Resignation Request</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card className="max-w-[500px]">
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              {types.map((t: any) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason *</label>
            <textarea rows={4} required value={form.reason}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Resignation Date *" type="date" required value={form.resignationDate}
              onChange={(e) => setForm({ ...form, resignationDate: e.target.value })} />
            <Input label="Effective Date *" type="date" required value={form.effectiveDate}
              onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
          </div>
          <Button type="submit" disabled={createResignation.isPending} className="w-full">
            {createResignation.isPending ? 'Submitting…' : 'Submit Resignation'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
