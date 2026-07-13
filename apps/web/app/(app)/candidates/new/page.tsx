'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCandidate } from '@/hooks/use-candidates';
import { Button, Card, Input } from '@/components/ui';

export default function NewCandidatePage() {
  const router = useRouter();
  const createCandidate = useCreateCandidate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    source: '', currentCompany: '', currentPosition: '', notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const result = await createCandidate.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        source: form.source || undefined,
        currentCompany: form.currentCompany || undefined,
        currentPosition: form.currentPosition || undefined,
        notes: form.notes || undefined,
      });
      router.push(`/candidates/${result.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 className="mt-0">New Candidate</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card className="max-w-[500px]">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" type="text" required value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name *" type="text" required value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input label="Email *" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" type="text" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Source (e.g. LinkedIn, Referral)" type="text" value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Current Company" type="text" value={form.currentCompany}
              onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} />
            <Input label="Current Position" type="text" value={form.currentPosition}
              onChange={(e) => setForm({ ...form, currentPosition: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes</label>
            <textarea rows={3} value={form.notes}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create Candidate'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
