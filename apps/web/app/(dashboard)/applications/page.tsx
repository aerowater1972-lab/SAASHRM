'use client';

import Link from 'next/link';
import { useApplications } from '@/lib/hooks/recruitment';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Search, Send } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  NEW: 'info',
  SCREENING: 'warning',
  INTERVIEW: 'warning',
  OFFER: 'success',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  WITHDRAWN: 'secondary',
};

export default function ApplicationsPage() {
  const { rows: apps, total, page, setPage, search, setSearch, isLoading, error, refetch } = useApplications();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lamaran Masuk</h1>
        <p className="text-sm text-muted-foreground">Kelola lamaran dari kandidat</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari status…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={5} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && apps.length === 0 && (
        <EmptyState title="Belum ada lamaran" description="Lamaran akan muncul setelah kandidat melamar." />
      )}

      {!isLoading && !error && apps.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Kandidat</th>
                    <th className="px-4 py-3 font-medium">Lowongan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Gaji Diharapkan</th>
                    <th className="px-4 py-3 font-medium">Tanggal Lamar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {apps.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/applications/${a.id}`} className="font-medium hover:underline flex items-center gap-2">
                          <Send className="h-4 w-4 text-muted-foreground" />
                          {a.candidate?.firstName} {a.candidate?.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.jobPosting?.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[a.status] || 'secondary') as any}>{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {a.expectedSalary ? `Rp ${Number(a.expectedSalary).toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(a.appliedAt).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
    </div>
  );
}
