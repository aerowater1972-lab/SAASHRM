'use client';

import Link from 'next/link';
import { useBenefits } from '@/lib/hooks/benefits';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Gift, Search } from 'lucide-react';

export default function BenefitsPage() {
  const { rows: benefits, total, page, setPage, search, setSearch, isLoading, error, refetch } = useBenefits();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Benefits</h1>
        <p className="text-sm text-muted-foreground">Kelola tunjangan dan benefit karyawan</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari kode, nama, tipe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && benefits.length === 0 && (
        <EmptyState title="Belum ada benefit" description="Benefit akan muncul setelah ditambahkan oleh admin." />
      )}

      {!isLoading && !error && benefits.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Kode</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Jumlah</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {benefits.map((b: any) => (
                    <tr key={b.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.code}</td>
                      <td className="px-4 py-3">
                        <Link href={`/benefits/${b.id}`} className="font-medium hover:underline">
                          {b.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{b.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {b.amount ? `Rp ${Number(b.amount).toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={b.isActive ? 'success' : 'secondary'}>
                          {b.isActive ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
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
