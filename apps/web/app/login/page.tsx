'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ChevronLeft } from 'lucide-react';

interface TenantInfo { id: string; name: string; code?: string }

const DEMO_ACCOUNTS = [
  { email: 'admin@flexy.local', password: 'admin123', label: 'Admin (default tenant)', tenant: 'default' },
  { email: 'budi@flexy.local', password: 'password123', label: 'Employee (default tenant)', tenant: 'default' },
  { email: 'admin@nusantarasejahtera.co.id', password: 'Demo123!', label: 'Admin PT Nusantara (demo data)', tenant: 'nusantara' },
  { email: 'maya.sari@nusantarasejahtera.co.id', password: 'Demo123!', label: 'HR PT Nusantara (demo data)', tenant: 'nusantara' },
  { email: 'budi.santoso@nusantarasejahtera.co.id', password: 'Demo123!', label: 'Karyawan PT Nusantara (demo data)', tenant: 'nusantara' },
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password, selectedTenant); router.replace('/dashboard'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login gagal'); }
    finally { setLoading(false); }
  }

  if (step === 'tenant') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Flexy HRMS</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Pilih workspace Anda</p>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <p className="text-sm text-muted-foreground text-center">Memuat tenants…</p>
            ) : (
              <div className="space-y-2">
                {tenants.map((t: TenantInfo) => (
                  <button key={t.id} onClick={() => { setSelectedTenant(t.id); setStep('credentials'); }}
                    className="w-full p-3 rounded-lg border border-border bg-card text-left text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{t.name}</span>
                    {t.code ? <span className="ml-2 text-muted-foreground">({t.code})</span> : null}
                  </button>
                ))}
                <hr className="border-border my-3" />
                <button onClick={() => { setSelectedTenant('default'); setStep('credentials'); }}
                  className="w-full p-2.5 rounded-lg border border-dashed border-border bg-transparent text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Gunakan tenant custom
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <button onClick={() => setStep('tenant')} className="bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-foreground flex items-center gap-1 mb-2">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </button>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Flexy HRMS</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Masuk ke <strong>{selectedTenant}</strong></p>
        </CardHeader>
        <CardContent>
          {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Masuk…' : 'Masuk'}</Button>
          </form>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Akun demo:</p>
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} type="button" onClick={() => { setEmail(a.email); setPassword(a.password); }}
                className="w-full text-left p-2 mb-1 rounded-lg border border-border bg-card text-xs text-foreground hover:bg-accent transition-colors"
              >{a.label}</button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
