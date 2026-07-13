'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateJob } from '@/hooks/use-jobs';
import { Button, Card, Input } from '@/components/ui';

const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();
  const [form, setForm] = useState({
    title: '', description: '', requirements: '', responsibilities: '',
    positionId: '', employmentType: 'FULL_TIME', location: '',
    minSalary: '', maxSalary: '', slots: '1',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const result = await createJob.mutateAsync({
        title: form.title,
        description: form.description,
        requirements: form.requirements || undefined,
        responsibilities: form.responsibilities || undefined,
        positionId: form.positionId,
        employmentType: form.employmentType,
        location: form.location || undefined,
        minSalary: form.minSalary ? Number(form.minSalary) : undefined,
        maxSalary: form.maxSalary ? Number(form.maxSalary) : undefined,
        slots: Number(form.slots),
      });
      router.push(`/jobs/${result.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 className="mt-0">New Job Posting</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card className="max-w-[600px]">
          <Input label="Job Title *" type="text" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description *</label>
            <textarea rows={4} required value={form.description}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Position ID *" type="text" required value={form.positionId}
              onChange={(e) => setForm({ ...form, positionId: e.target.value })} />
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Employment Type</label>
              <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                {employmentTypes.map((t: any) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <Input label="Location" type="text" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Min Salary" type="number" min={0} value={form.minSalary}
              onChange={(e) => setForm({ ...form, minSalary: e.target.value })} />
            <Input label="Max Salary" type="number" min={0} value={form.maxSalary}
              onChange={(e) => setForm({ ...form, maxSalary: e.target.value })} />
            <Input label="Slots" type="number" min={1} value={form.slots}
              onChange={(e) => setForm({ ...form, slots: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Requirements</label>
            <textarea rows={4} value={form.requirements}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Responsibilities</label>
            <textarea rows={4} value={form.responsibilities}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create Job Posting'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
