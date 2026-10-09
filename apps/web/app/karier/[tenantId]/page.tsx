'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/data-states';
import { Briefcase, MapPin, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1';

function formatRp(n: unknown) {
  if (n === null || n === undefined) return null;
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

export default function CareerListPage({ params }: { params: { tenantId: string } }) {
  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/careers/${params.tenantId}/jobs`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Perusahaan tidak ditemukan');
        return r.json();
      })
      .then((d) => {
        const payload = d?.data ?? d;
        setTenant(payload.tenant ?? null);
        setJobs(payload.jobs ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.tenantId]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Karier</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tenant?.name ?? 'Lowongan Kerja'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Temukan peran yang cocok untuk Anda. Lamaran langsung tercatat di sistem rekrutmen kami.</p>
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground">Memuat lowongan…</p>}
      {error && <ErrorState onRetry={() => window.location.reload()} />}
      {!loading && !error && jobs.length === 0 && (
        <EmptyState title="Belum ada lowongan" description="Saat ini tidak ada posisi yang dibuka. Silakan kembali lagi." />
      )}
      <div className="grid gap-3">
        {jobs.map((j) => (
          <Link key={j.id} href={`/karier/${params.tenantId}/${j.id}`} className="no-underline">
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{j.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {j.employmentType && <Badge variant="secondary" className="text-[10px]">{j.employmentType}</Badge>}
                    {j.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                    {j.postedAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(j.postedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  </div>
                  {(j.minSalary != null || j.maxSalary != null) && (
                    <p className="mt-1 text-sm font-medium text-primary">
                      {j.minSalary != null && j.maxSalary != null
                        ? `${formatRp(j.minSalary)} – ${formatRp(j.maxSalary)}`
                        : formatRp(j.minSalary ?? j.maxSalary)}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm">Lamar</Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">Didukung oleh Flexy HRMS</p>
    </div>
  );
}
