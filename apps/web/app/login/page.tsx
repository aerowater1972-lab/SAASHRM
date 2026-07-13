'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, API_BASE } from '@/lib/api';
import { Button } from '@/components/ui';

interface TenantInfo { id: string; name: string; code: string; }

const DEMO_ACCOUNTS = [
  { email: 'admin@flexy.local', password: 'admin123', label: 'Admin (full access)', tenant: 'default' },
  { email: 'budi@flexy.local', password: 'password123', label: 'Employee (limited)', tenant: 'default' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, token, ready } = useAuth();
  const [step, setStep] = useState<'tenant' | 'credentials'>('tenant');
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('default');
  const [email, setEmail] = useState('admin@flexy.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/tenants`, { headers: { 'x-tenant-id': 'default' } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setTenants(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoadingTenants(false));
  }, []);

  if (ready && token) { router.replace('/dashboard'); return null; }

  async function onSubmit(e: React.FormEvent) { e.preventDefault(); setError(''); setLoading(true); try { await login(email, password, selectedTenant); router.replace('/dashboard'); } catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); } finally { setLoading(false); } }

  if (step === 'tenant') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 m-0">Flexy HRMS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Select your workspace</p>
          {loadingTenants ? <p className="text-sm text-gray-400">Loading tenants…</p> : (
            <div className="flex flex-col gap-2">
              {tenants.map((t: any) => (
                <button key={t.id} onClick={() => { setSelectedTenant(t.code); setStep('credentials'); }}
                  className="w-full p-3.5 rounded-lg border border-gray-200 bg-gray-50 text-left text-sm text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-2 text-gray-400">({t.code})</span>
                </button>
              ))}
              <hr className="border-gray-200 dark:border-gray-600 my-3" />
              <button onClick={() => { setSelectedTenant('default'); setStep('credentials'); }}
                className="w-full p-2.5 rounded-lg border border-dashed border-gray-300 bg-transparent text-sm text-gray-400 hover:text-gray-600 dark:border-gray-600 dark:text-gray-500">
                + Use custom tenant
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button onClick={() => setStep('tenant')} className="bg-transparent border-none text-gray-400 cursor-pointer text-sm mb-3 hover:text-gray-600 dark:hover:text-gray-300">&larr; Back to tenants</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 m-0">Flexy HRMS</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Sign in to <strong>{selectedTenant}</strong></p>
        {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-400 mb-2">Demo accounts:</p>
          {DEMO_ACCOUNTS.map((a: any) => (
            <button key={a.email} type="button" onClick={() => { setEmail(a.email); setPassword(a.password); }}
              className="w-full text-left p-2 mb-1 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
