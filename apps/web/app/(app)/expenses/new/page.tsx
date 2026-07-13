'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/lib/api';
import { useCreateExpense } from '@/hooks/use-expenses';
import { Button, Card, Input, Select } from '@/components/ui';

const CATEGORIES = ['TRAVEL', 'MEAL', 'ENTERTAINMENT', 'TRANSPORTATION', 'OFFICE_SUPPLIES', 'UTILITIES', 'TRAINING', 'MEDICAL', 'OTHER'];

interface Item {
  category: string;
  description: string;
  amount: number;
  date: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const createExpense = useCreateExpense();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const token = getToken();
  const employeeId = token ? (() => { try { return JSON.parse(atob(token.split('.')[1])).employeeId; } catch { return null; } })() : null;

  function addItem() {
    setItems([...items, { category: 'OTHER', description: '', amount: 0, date: new Date().toISOString().slice(0, 10) }]);
  }

  function updateItem(i: number, field: keyof Item, value: string | number) {
    const copy = items.map((it: any, idx: any) => (idx === i ? { ...it, [field]: value } : it));
    setItems(copy);
  }

  function removeItem(i: number) {
    setItems(items.filter((_: any, idx: any) => idx !== i));
  }

  const total = items.reduce((s: any, it: any) => s + Number(it.amount || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (items.length === 0) { setError('At least one expense item is required'); return; }
    setSaving(true);
    setError('');
    try {
      const claim = await createExpense.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        items: items.map((it: any) => ({ ...it, amount: Number(it.amount) })),
      });
      router.push(`/expenses/${claim.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!employeeId) {
    return (
      <div>
        <Link href="/expenses" className="text-xs">← Back to expenses</Link>
        <Card className="mt-4">
          <p>Your account doesn&apos;t have an employee profile. Please log in as an employee to submit claims.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Link href="/expenses" className="text-xs">← Back to expenses</Link>
      <h2 className="mt-2">New Expense Claim</h2>
      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="mb-3">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>

          <hr className="border-gray-700" />
          <div className="flex items-center justify-between mb-2">
            <strong>Items</strong>
            <Button type="button" onClick={addItem}>+ Add Item</Button>
          </div>

          {items.map((item: any, i: any) => (
            <div key={i} className="flex gap-2 mb-2 items-end">
              <Select
                value={item.category}
                onChange={(e) => updateItem(i, 'category', e.target.value)}
                options={CATEGORIES.map((c: any) => ({ value: c, label: c }))}
              />
              <input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              <input type="number" placeholder="Amount" value={item.amount || ''} onChange={(e) => updateItem(i, 'amount', Number(e.target.value))}
                className="w-30 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              <input type="date" value={item.date} onChange={(e) => updateItem(i, 'date', e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              <button type="button" onClick={() => removeItem(i)} className="bg-transparent border-none cursor-pointer text-red-500">✕</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-gray-400 text-xs">No items yet. Click &quot;+ Add Item&quot; to add expenses.</p>}

          <hr className="border-gray-700" />
          <div className="flex items-center justify-between">
            <strong>Total: {total.toLocaleString('id-ID')}</strong>
            <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit Claim'}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
