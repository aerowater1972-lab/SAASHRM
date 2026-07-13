'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCertifications } from '@/hooks/use-learning';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

interface Certification { id: string; name: string; issuer?: string; certificateNumber?: string; issueDate: string; expiryDate?: string; status: string; employeeId: string; employee?: { fullName: string }; }

export default function CertificationsPage() {
  const pathname = usePathname();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', issuer: '', certificateNumber: '', issueDate: '', expiryDate: '', employeeId: '' });
  const [error, setError] = useState('');

  const { data: certs = [], isLoading, refetch } = useCertifications();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editId) { await api.put(`/learning/certifications/${editId}`, form); } else { await api.post('/learning/certifications', form); }
      setShowForm(false); setEditId(null); setForm({ name: '', issuer: '', certificateNumber: '', issueDate: '', expiryDate: '', employeeId: '' });
      await refetch();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="flex gap-3 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/learning/trainings" className={`no-underline text-sm ${pathname.startsWith('/learning/trainings') ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 font-normal'}`}>Trainings</Link>
        <Link href="/learning/certifications" className={`no-underline text-sm ${pathname === '/learning/certifications' ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 font-normal'}`}>Certifications</Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0">Certifications</h3>
        <Button variant="secondary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', issuer: '', certificateNumber: '', issueDate: '', expiryDate: '', employeeId: '' }); }}>
          {showForm ? 'Cancel' : '+ New'}
        </Button>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 max-w-[500px] mb-4">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Issuer</label>
              <input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Cert Number</label>
              <input value={form.certificateNumber} onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Issue Date</label>
              <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Employee ID</label>
              <input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit">{editId ? 'Update' : 'Create'}</Button>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && (
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-gray-500 dark:text-gray-400 text-xs">
            <th className="py-2">Name</th><th>Employee</th><th>Issuer</th><th>Issue Date</th><th>Expiry</th><th>Status</th>
          </tr></thead>
          <tbody>
            {certs.map((c: any) => (
              <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2.5">{c.name}</td>
                <td className="text-xs">{c.employee?.fullName || c.employeeId}</td>
                <td>{c.issuer || '—'}</td>
                <td>{new Date(c.issueDate).toLocaleDateString('id-ID')}</td>
                <td>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('id-ID') : '—'}</td>
                <td>{c.status}</td>
              </tr>
            ))}
            {certs.length === 0 && <tr><td colSpan={6} className="text-gray-500 dark:text-gray-400 py-2.5">No certifications.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
