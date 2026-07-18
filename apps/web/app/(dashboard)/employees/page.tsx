'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEmployees } from '@/lib/hooks/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Plus, Upload, Download, Search } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  PENDING_ACTIVATION: 'warning',
  INACTIVE: 'secondary',
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Aktif',
  PENDING_ACTIVATION: 'Pending',
  INACTIVE: 'Tidak Aktif',
};

export default function EmployeesPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [positionId, setPositionId] = useState<string | undefined>(undefined);
  const [gradeId, setGradeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const dept = searchParams.get('departmentId') || undefined;
    const pos = searchParams.get('positionId') || undefined;
    const grade = searchParams.get('gradeId') || undefined;
    setDepartmentId(dept);
    setPositionId(pos);
    setGradeId(grade);
    setPage(1);
  }, [searchParams]);

  const { data, isLoading, error, refetch } = useEmployees({
    page,
    limit: 20,
    q: search || undefined,
    status: statusFilter || undefined,
    departmentId,
    positionId,
    gradeId,
  });

  const employees = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Karyawan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data karyawan dan organisasi
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Karyawan
            </Button>
          </Link>
          <Link href="/employees/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, ID, email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PENDING_ACTIVATION">Pending</option>
          <option value="INACTIVE">Tidak Aktif</option>
        </select>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {total} karyawan
        </p>
      </div>

      {(departmentId || positionId || gradeId) && (
        <div className="text-xs text-muted-foreground">
          Diffilter dari Organisasi:
          {departmentId && <span className="ml-1 rounded bg-primary/10 px-2 py-0.5 text-primary">Departemen</span>}
          {positionId && <span className="ml-1 rounded bg-primary/10 px-2 py-0.5 text-primary">Posisi</span>}
          {gradeId && <span className="ml-1 rounded bg-primary/10 px-2 py-0.5 text-primary">Grade</span>}
        </div>
      )}

      {error && (
        <ErrorState
          message={error instanceof Error ? error.message : 'Gagal memuat data karyawan'}
          onRetry={() => refetch()}
        />
      )}

      {isLoading && <TableSkeleton rows={8} columns={5} />}

      {!isLoading && !error && employees.length === 0 && (
        <EmptyState
          title={search || statusFilter ? 'Tidak ada hasil' : 'Belum ada karyawan'}
          description={
            search || statusFilter
              ? 'Tidak ada karyawan yang sesuai dengan filter Anda.'
              : 'Belum ada data karyawan. Tambah karyawan baru untuk memulai.'
          }
          action={
            !search && !statusFilter
              ? { label: 'Tambah Karyawan', onClick: () => window.location.href = '/employees/new' }
              : undefined
          }
        />
      )}

      {!isLoading && !error && employees.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-xs">{emp.employeeId}</TableCell>
                  <TableCell>
                    <Link
                      href={`/employees/${emp.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {emp.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {emp.employments?.[0]?.department?.name || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[emp.status] || 'secondary'}>
                      {statusLabel[emp.status] || emp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Halaman {data.meta.page} dari {data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data.meta.totalPages || 1)}
                  onClick={() => setPage(page + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
