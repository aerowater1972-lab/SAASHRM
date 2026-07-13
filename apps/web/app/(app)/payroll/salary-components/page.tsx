'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Component { id: string; employeeId: string; componentType: string; amount: number; effectiveDate: string; endDate: string | null; }

const TYPE_COLORS: Record<string, string> = { basic_salary: 'text-green-500', allowance: 'text-blue-500', deduction: 'text-red-500' };

export default function SalaryComponentsPage() {
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', componentType: 'basic_salary', amount: 0, effectiveDate: '' });

  const { data: data = [], refetch } = useQuery({
    queryKey: ['salary-components', selectedEmp],
    queryFn: () => api.get<Component[]>(`/payroll/salary-components${selectedEmp ? `?employeeId=${selectedEmp}` : ''}`),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get<any[]>('/employees'),
  });

  useEffect(() => { if (employeesData) setEmployees(employeesData); }, [employeesData]);

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError('');
    try { await api.post('/payroll/salary-components', { ...form, amount: Number(form.amount) }); setShowForm(false); setForm({ employeeId: '', componentType: 'basic_salary', amount: 0, effectiveDate: '' }); await refetch(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold m-0">Salary Components</h2>
        <Button variant={showForm ? 'danger' : 'primary'} size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Component'}
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

      <div className="mb-3">
        <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          <option value="">All employees</option>
          {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </select>
      </div>

      {showForm && (
        <Card className="max-w-md mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Employee</label>
              <select value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select…</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={form.componentType} onChange={e => setForm({...form, componentType: e.target.value})}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="basic_salary">Basic Salary</option><option value="allowance">Allowance</option><option value="deduction">Deduction</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: +e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Effective Date</label>
              <input type="date" value={form.effectiveDate} onChange={e => setForm({...form, effectiveDate: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <Button type="submit" size="sm">Create</Button>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="pb-2 pr-4">Employee</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Amount</th><th className="pb-2 pr-4">Effective</th><th className="pb-2">End</th>
              </tr>
            </thead>
            <tbody>
              {data.map(c => {
                const emp = employees.find(e => e.id === c.employeeId);
                return (
                  <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                    <td className="py-2.5 pr-4">{emp?.fullName || c.employeeId}</td>
                    <td className={`py-2.5 pr-4 font-semibold ${TYPE_COLORS[c.componentType] || ''}`}>{c.componentType.replace('_', ' ').toUpperCase()}</td>
                    <td className="py-2.5 pr-4">{Number(c.amount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</td>
                    <td className="py-2.5 pr-4">{new Date(c.effectiveDate).toLocaleDateString('id-ID')}</td>
                    <td className="py-2.5">{c.endDate ? new Date(c.endDate).toLocaleDateString('id-ID') : '—'}</td>
                  </tr>
                );
              })}
              {data.length === 0 && <tr><td colSpan={5} className="py-4 text-sm text-gray-400">No salary components.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
