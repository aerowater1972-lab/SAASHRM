'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { useRoles } from '@/hooks/use-admin';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Role { id: string; name: string; description?: string; permissions?: { id: string; action: string; module: string }[]; }

export default function RolesPage() {
  const { data: roles = [] } = useRoles();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError('');
    try { await api.post('/admin/roles', form); setShowForm(false); setForm({ name: '', description: '' }); queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles }); }
    catch (e: any) { setError(e.message); }
  }

  async function handleDelete(id: string) { if (!confirm('Delete this role?')) return; try { await api.delete(`/admin/roles/${id}`); queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles }); } catch (e: any) { setError(e.message); } }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold m-0">Roles</h2>
        <Button variant={showForm ? 'danger' : 'primary'} size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Role'}
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {showForm && (
        <Card className="max-w-md mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
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
                <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Description</th><th className="pb-2 pr-4">Permissions</th><th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                  <td className="py-2.5 pr-4 font-medium">{r.name}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{r.description || '—'}</td>
                  <td className="py-2.5 pr-4">{r.permissions?.length || 0}</td>
                  <td className="py-2.5"><Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button></td>
                </tr>
              ))}
              {roles.length === 0 && <tr><td colSpan={4} className="py-4 text-sm text-gray-400">No roles.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
