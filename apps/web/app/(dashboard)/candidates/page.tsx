'use client';

import Link from 'next/link';
import { useCandidateList } from '@/lib/hooks/recruitment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Plus, Search } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  ACTIVE: 'success',
  PASSIVE: 'secondary',
  HIRED: 'success',
  REJECTED: 'destructive',
  IN_REVIEW: 'warning',
  SHORTLISTED: 'info',
};

export default function CandidatesPage() {
  const { rows: candidates, total, page, setPage, search, setSearch, isLoading, error, refetch } = useCandidateList();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kandidat</h1>
          <p className="text-sm text-muted-foreground">Kelola data kandidat dan pelamar</p>
        </div>
        <Link href="/candidates/new">
          <Button><Plus className="mr-2 h-4 w-4" />Kandidat Baru</Button>
        </Link>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama, email, posisi…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={6} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && candidates.length === 0 && (
        <EmptyState title="Belum ada kandidat" description="Kandidat akan muncul setelah ditambahkan atau melamar." />
      )}

      {!isLoading && !error && candidates.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Posisi Saat Ini</th>
                    <th className="px-4 py-3 font-medium">Sumber</th>
                    <th className="px-4 py-3 font-medium">Lamaran</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {candidates.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/candidates/${c.id}`} className="font-medium hover:underline">
                          {c.firstName} {c.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.currentPosition ? `${c.currentPosition}${c.currentCompany ? ` @ ${c.currentCompany}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.source || '—'}</td>
                      <td className="px-4 py-3 text-xs">{c.applications?.length || 0}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[c.status] || 'secondary') as any}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString('id-ID')}
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
