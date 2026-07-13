'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';

export default function NewLoanPage() {
  const router = useRouter();
  const [form, setForm] = useState({ amount: '', installmentCount: '12', purpose: '', startDeductionFrom: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await api.post<any>('/expense/loans', {
        amount: Number(form.amount),
        installmentCount: Number(form.installmentCount),
        purpose: form.purpose || undefined,
        startDeductionFrom: form.startDeductionFrom || undefined,
        notes: form.notes || undefined,
      });
      router.push(`/loans/${result.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const installment = Number(form.amount) / Number(form.installmentCount) || 0;

  return (
    <div>
      <h2 className="mt-0">New Loan Application</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card className="max-w-md">
          <div className="mb-3">
            <Input label="Loan Amount (Rp)" type="number" min={1} required value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="mb-3">
            <Input label="Installment Count (months)" type="number" min={1} required value={form.installmentCount}
              onChange={(e) => setForm({ ...form, installmentCount: e.target.value })} />
          </div>
          {form.amount && Number(form.amount) > 0 && (
            <p className="text-xs text-gray-400 -mt-2 mb-3">
              Installment: Rp {installment.toLocaleString('id-ID')}/month
            </p>
          )}
          <div className="mb-3">
            <Input label="Purpose" type="text" value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <div className="mb-3">
            <Input label="Start Deduction From (month)" type="month" value={form.startDeductionFrom}
              onChange={(e) => setForm({ ...form, startDeductionFrom: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes</label>
            <textarea rows={3} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Submitting…' : 'Submit Loan Application'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
