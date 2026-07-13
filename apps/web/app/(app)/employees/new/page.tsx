'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    employeeId: '', fullName: '', email: '', phone: '',
    birthDate: '', birthPlace: '', gender: '', religion: '',
    maritalStatus: '', idCardNumber: '', taxIdNumber: '',
    address: '', city: '', province: '', postalCode: '',
    startDate: '', notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v) payload[k] = v;
    }
    setLoading(true);
    try {
      const res = await api.post<any>('/employees', payload);
      router.push(`/employees/${res.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: 'employeeId', label: 'Employee ID', required: true },
    { key: 'fullName', label: 'Full Name', required: true },
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'birthDate', label: 'Birth Date', type: 'date' },
    { key: 'birthPlace', label: 'Birth Place' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['', 'MALE', 'FEMALE'] },
    { key: 'religion', label: 'Religion' },
    { key: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['', 'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] },
    { key: 'idCardNumber', label: 'ID Card Number' },
    { key: 'taxIdNumber', label: 'Tax ID (NPWP)' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'province', label: 'Province' },
    { key: 'postalCode', label: 'Postal Code' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div>
      <h2 className="mt-0">New Employee</h2>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f: any) => (
            <div key={f.key} className="flex flex-col gap-1" style={{ gridColumn: ['address', 'notes'].includes(f.key) ? '1 / -1' : undefined }}>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'select' ? (
                <select value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                  {f.options?.map((o: any) => <option key={o} value={o}>{o || '—'}</option>)}
                </select>
              ) : f.key === 'notes' ? (
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  required={f.required}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? 'Creating…' : 'Create Employee'}
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
