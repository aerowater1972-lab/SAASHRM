'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Input, Select, Card } from '@/components/ui';

interface Rule { id: string; benefitId: string; gradeId: string | null; departmentId: string | null; benefit?: { name: string }; grade?: { name: string }; department?: { name: string }; createdAt: string; }

export default function EligibilityRulesPage() {
  const queryClient = useQueryClient();
  const { data: rules = [], error: queryError } = useQuery({
    queryKey: ['eligibility-rules'],
    queryFn: () => api.get<Rule[]>('/benefits/eligibility-rules'),
  });
  const { data: benefits = [] } = useQuery({
    queryKey: ['benefits'],
    queryFn: () => api.get<any[]>('/benefits'),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<any[]>('/employees/organization/departments'),
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => api.get<any[]>('/employees/organization/grades'),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ benefitId: '', gradeId: '', departmentId: '' });
  const [actionError, setActionError] = useState('');
  const error = (queryError instanceof Error ? queryError.message : '') || actionError;

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setActionError('');
    try { await api.post('/benefits/eligibility-rules', form); setShowForm(false); setForm({ benefitId: '', gradeId: '', departmentId: '' }); queryClient.invalidateQueries({ queryKey: ['eligibility-rules'] }); }
    catch (e: any) { setActionError(e.message); }
  }

  async function handleDelete(id: string) { try { await api.delete(`/benefits/eligibility-rules/${id}`); queryClient.invalidateQueries({ queryKey: ['eligibility-rules'] }); } catch (e: any) { setActionError(e.message); } }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold m-0">Benefit Eligibility Rules</h2>
        <Button variant={showForm ? 'danger' : 'primary'} size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Rule'}
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {showForm && (
        <Card className="max-w-md mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Select label="Benefit" options={[{ value: '', label: 'Select…' }, ...benefits.map((b: any) => ({ value: b.id, label: b.name }))]} value={form.benefitId} onChange={e => setForm({...form, benefitId: e.target.value})} required />
            <Select label="Grade (optional)" options={[{ value: '', label: 'Any grade' }, ...grades.map((g: any) => ({ value: g.id, label: g.name }))]} value={form.gradeId} onChange={e => setForm({...form, gradeId: e.target.value})} />
            <Select label="Department (optional)" options={[{ value: '', label: 'Any department' }, ...departments.map((d: any) => ({ value: d.id, label: d.name }))]} value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})} />
            <Button type="submit" size="sm">Create</Button>
          </form>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="pb-2 pr-4">Benefit</th>
              <th className="pb-2 pr-4">Grade</th>
              <th className="pb-2 pr-4">Department</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                <td className="py-2.5 pr-4">{r.benefit?.name || '—'}</td>
                <td className="py-2.5 pr-4">{r.grade?.name || 'Any'}</td>
                <td className="py-2.5 pr-4">{r.department?.name || 'Any'}</td>
                <td className="py-2.5">
                  <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-sm text-gray-400 dark:text-gray-500">No eligibility rules.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
