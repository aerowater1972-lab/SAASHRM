'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDepartments, usePositions, useGrades, useCreateDepartment, useCreatePosition, useCreateGrade, useOrgChart } from '@/lib/hooks/organization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDepartmentSchema, createPositionSchema, createGradeSchema, type CreateDepartmentInput, type CreatePositionInput, type CreateGradeInput } from '@/lib/schemas/organization';
import { Building2, Users, Layers, Plus, GitBranch, ChevronRight, ChevronDown } from 'lucide-react';

function DepartmentForm({ onSuccess }: { onSuccess: () => void }) {
  const createDept = useCreateDepartment();
  const form = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
  });

  async function onSubmit(data: CreateDepartmentInput) {
    createDept.mutate(data, { onSuccess });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Nama Departemen</Label>
        <Input {...form.register('name')} placeholder="IT Department" />
        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Kode</Label>
        <Input {...form.register('code')} placeholder="IT" />
        {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Organization ID</Label>
        <Input {...form.register('organizationId')} placeholder="UUID organization" />
      </div>
      <Button type="submit" disabled={createDept.isPending} className="w-full">
        {createDept.isPending ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </form>
  );
}

function PositionForm({ onSuccess }: { onSuccess: () => void }) {
  const createPos = useCreatePosition();
  const form = useForm<CreatePositionInput>({
    resolver: zodResolver(createPositionSchema),
  });

  async function onSubmit(data: CreatePositionInput) {
    createPos.mutate(data, { onSuccess });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Nama Posisi</Label>
        <Input {...form.register('name')} placeholder="Software Engineer" />
        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Kode</Label>
        <Input {...form.register('code')} placeholder="SE" />
        {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Department ID</Label>
        <Input {...form.register('departmentId')} placeholder="UUID department" />
      </div>
      <Button type="submit" disabled={createPos.isPending} className="w-full">
        {createPos.isPending ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </form>
  );
}

export default function OrganizationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('departments');
  const [dialog, setDialog] = useState<'department' | 'position' | 'grade' | null>(null);

  const [asOfDate, setAsOfDate] = useState('');
  const [selected, setSelected] = useState<{ node: any; level: number } | null>(null);

  const { data: departments, isLoading: deptLoading, error: deptError, refetch: deptRefetch } = useDepartments();
  const { data: positions, isLoading: posLoading, error: posError, refetch: posRefetch } = usePositions();
  const { data: grades, isLoading: gradeLoading, error: gradeError, refetch: gradeRefetch } = useGrades();
  const { data: orgChart, isLoading: chartLoading } = useOrgChart(asOfDate || undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organisasi</h1>
          <p className="text-sm text-muted-foreground">
            Kelola struktur organisasi, departemen, posisi, dan grade
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialog === 'department'} onOpenChange={(o) => setDialog(o ? 'department' : null)}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setDialog('department')}>
                <Plus className="mr-2 h-4 w-4" />
                Departemen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Departemen</DialogTitle>
              </DialogHeader>
              <DepartmentForm onSuccess={() => { setDialog(null); deptRefetch(); }} />
            </DialogContent>
          </Dialog>
          <Dialog open={dialog === 'position'} onOpenChange={(o) => setDialog(o ? 'position' : null)}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setDialog('position')}>
                <Plus className="mr-2 h-4 w-4" />
                Posisi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Posisi</DialogTitle>
              </DialogHeader>
              <PositionForm onSuccess={() => { setDialog(null); posRefetch(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="departments">
            <Building2 className="mr-2 h-4 w-4" />
            Departemen
          </TabsTrigger>
          <TabsTrigger value="positions">
            <Users className="mr-2 h-4 w-4" />
            Posisi
          </TabsTrigger>
          <TabsTrigger value="grades">
            <Layers className="mr-2 h-4 w-4" />
            Grade
          </TabsTrigger>
          <TabsTrigger value="orgchart">
            <GitBranch className="mr-2 h-4 w-4" />
            Struktur Organisasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-3">
          {deptLoading && <TableSkeleton rows={5} columns={3} />}
          {deptError && <ErrorState onRetry={() => deptRefetch()} />}
          {!deptLoading && !deptError && (!departments || departments.length === 0) && (
            <EmptyState title="Belum ada departemen" description="Tambah departemen untuk memulai struktur organisasi." />
          )}
          {!deptLoading && !deptError && departments && departments.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => (
                <Card
                  key={dept.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/employees?departmentId=${dept.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/employees?departmentId=${dept.id}`); }}
                  className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">{dept.code}</p>
                      </div>
                      <Badge variant="secondary">Lv.{dept.level || '-'}</Badge>
                    </div>
                    {dept.children && dept.children.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {dept.children.map((child) => (
                          <div key={child.id} className="flex items-center gap-2 text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                            <ChevronRight className="h-3 w-3" />
                            {child.name}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-xs text-primary">Lihat karyawan &rarr;</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="positions" className="space-y-3">
          {posLoading && <TableSkeleton rows={5} columns={3} />}
          {posError && <ErrorState onRetry={() => posRefetch()} />}
          {!posLoading && !posError && (!positions || positions.length === 0) && (
            <EmptyState title="Belum ada posisi" description="Tambah posisi untuk setiap departemen." />
          )}
          {!posLoading && !posError && positions && positions.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {positions.map((pos) => (
                <Card
                  key={pos.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/employees?positionId=${pos.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/employees?positionId=${pos.id}`); }}
                  className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{pos.name}</p>
                        <p className="text-xs text-muted-foreground">{pos.code}</p>
                      </div>
                      {pos.isHead && <Badge variant="info">Kepala</Badge>}
                    </div>
                    {pos.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{pos.description}</p>
                    )}
                    <p className="mt-3 text-xs text-primary">Lihat penghuni posisi &rarr;</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grades" className="space-y-3">
          {gradeLoading && <TableSkeleton rows={5} columns={3} />}
          {gradeError && <ErrorState onRetry={() => gradeRefetch()} />}
          {!gradeLoading && !gradeError && (!grades || grades.length === 0) && (
            <EmptyState title="Belum ada grade" description="Tambah grade untuk level jabatan." />
          )}
          {!gradeLoading && !gradeError && grades && grades.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {grades.map((grade) => (
                <Card
                  key={grade.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/employees?gradeId=${grade.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/employees?gradeId=${grade.id}`); }}
                  className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{grade.name}</p>
                        <p className="text-xs text-muted-foreground">{grade.code}</p>
                      </div>
                      <Badge variant="secondary">Level {grade.level}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-primary">Lihat karyawan &rarr;</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

         <TabsContent value="orgchart" className="space-y-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="asof">Berlaku per tanggal</Label>
            <Input
              id="asof"
              type="date"
              className="w-auto"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
          {chartLoading && <TableSkeleton rows={8} columns={1} />}
          {!chartLoading && !orgChart && <EmptyState title="Struktur tidak tersedia" description="Belum ada data struktur organisasi." />}
          {!chartLoading && orgChart && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <Card>
                <CardContent className="p-6">
                  <OrgChartNode node={orgChart} level={0} onSelect={(n, l) => setSelected({ node: n, level: l })} />
                </CardContent>
              </Card>
              <Card className="h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detail</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {!selected && <p className="text-muted-foreground">Pilih node untuk melihat detail.</p>}
                  {selected && (
                    <div className="space-y-2">
                      <p className="font-semibold">{selected.node.label}</p>
                      <Badge variant={selected.node.type === 'department' ? 'info' : selected.node.type === 'position' ? 'warning' : 'success'} className="text-[10px]">
                        {selected.node.type === 'department' ? 'Departemen' : selected.node.type === 'position' ? 'Posisi' : 'Karyawan'}
                      </Badge>
                      {selected.node.vacant && <Badge variant="destructive" className="ml-1 text-[10px]">Kosong</Badge>}
                      {selected.node.headName && <p className="text-xs text-muted-foreground">Pimpinan: {selected.node.headName}</p>}
                      {selected.node.positionTitle && <p className="text-xs text-muted-foreground">Jabatan: {selected.node.positionTitle}</p>}
                      {selected.node.email && <p className="text-xs text-muted-foreground">Email: {selected.node.email}</p>}
                      {selected.node.employeeId && <p className="text-xs text-muted-foreground">ID: {selected.node.employeeId}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrgChartNode({ node, level, onSelect }: { node: any; level: number; onSelect?: (n: any, l: number) => void }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const borderClass = node.vacant
    ? 'border-2 border-dashed border-destructive/50 bg-destructive/5'
    : node.type === 'department'
      ? 'border-primary/30 bg-primary/5'
      : node.type === 'position'
        ? 'border-blue-200 dark:border-blue-800'
        : 'border-green-200 dark:border-green-800';

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer ${borderClass}`}
        style={{ marginLeft: level * 24 }}
        onClick={() => onSelect?.(node, level)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(node, level); }}
      >
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted"
            aria-label={expanded ? 'Tutup' : 'Buka'}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{node.label}</p>
          {node.headName && (
            <p className="text-xs text-muted-foreground">{node.headName}</p>
          )}
          {node.vacant && <p className="text-xs text-destructive">Posisi kosong</p>}
        </div>
        <Badge variant={node.vacant ? 'destructive' : node.type === 'department' ? 'info' : node.type === 'position' ? 'warning' : 'success'} className="text-[10px]">
          {node.type === 'department' ? 'Dept' : node.type === 'position' ? 'Pos' : 'Emp'}
        </Badge>
      </div>
      {expanded && hasChildren && (
        <div className="mt-2 space-y-2">
          {node.children.map((child: any) => (
            <OrgChartNode key={child.id} node={child} level={level + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
