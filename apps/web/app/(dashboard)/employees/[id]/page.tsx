'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmployee, useDeleteEmployee, useActivateEmployee, useDeactivateEmployee, useEmployeeDocuments, useEmployeeEmployments } from '@/lib/hooks/employees';
import { useQuery } from '@tanstack/react-query';
import { fetchDisciplinaryHistory, fetchEmployeeK3Profile } from '@/lib/api/employee-relations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle, FileText, Building2, Calendar, Phone, Mail, MapPin, User, ShieldAlert, GraduationCap } from 'lucide-react';

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

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: employee, isLoading, error, refetch } = useEmployee(id);
  const { data: documents } = useEmployeeDocuments(id);
  const { data: employments } = useEmployeeEmployments(id);
  const { data: spHistory = [] } = useQuery({
    queryKey: ['disciplinary-history', id],
    queryFn: () => fetchDisciplinaryHistory(id),
    enabled: !!id,
  });
  const { data: k3Profile } = useQuery({
    queryKey: ['k3-profile', id],
    queryFn: () => fetchEmployeeK3Profile(id),
    enabled: !!id,
  });
  const deleteMutation = useDeleteEmployee();
  const activateMutation = useActivateEmployee();
  const deactivateMutation = useDeactivateEmployee();

  if (isLoading) return <PageSkeleton />;

  if (error || !employee) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Karyawan tidak ditemukan'}
        onRetry={() => refetch()}
      />
    );
  }

  const initials = employee.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const currentEmployment = employee.employments?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{employee.fullName}</h1>
              <Badge variant={statusVariant[employee.status] || 'secondary'}>
                {statusLabel[employee.status] || employee.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employeeId} &middot; {employee.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/employees/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {employee.status === 'ACTIVE' && (
            <Button
              variant="outline"
              onClick={() => deactivateMutation.mutate(id)}
              disabled={deactivateMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Nonaktifkan
            </Button>
          )}
          {employee.status === 'INACTIVE' && (
            <Button
              variant="outline"
              onClick={() => activateMutation.mutate(id)}
              disabled={activateMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Aktifkan
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('Hapus karyawan ini?')) {
                deleteMutation.mutate(id, {
                  onSuccess: () => router.push('/employees'),
                });
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="employment">
            <Building2 className="mr-2 h-4 w-4" />
            Kepegawaian
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Dokumen
          </TabsTrigger>
          <TabsTrigger value="k3">
            <ShieldAlert className="mr-2 h-4 w-4" />
            K3 & SP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Pribadi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nama Lengkap</p>
                  <p>{employee.fullName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {employee.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telepon</p>
                  <p className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {employee.phone || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tanggal Lahir</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('id-ID') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempat Lahir</p>
                  <p>{employee.birthPlace || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Jenis Kelamin</p>
                  <p>{employee.gender === 'MALE' ? 'Laki-laki' : employee.gender === 'FEMALE' ? 'Perempuan' : '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agama</p>
                  <p>{employee.religion || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status Pernikahan</p>
                  <p>{employee.maritalStatus || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status Serikat Pekerja</p>
                  <p>
                    {employee.unionStatus === 'OFFICER'
                      ? 'Pengurus'
                      : employee.unionStatus === 'MEMBER'
                        ? 'Anggota'
                        : employee.unionStatus === 'NONE'
                          ? 'Bukan Anggota'
                          : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No. KTP</p>
                  <p>{employee.idCardNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">NPWP</p>
                  <p>{employee.taxIdNumber || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {employee.address && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alamat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p>{employee.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {[employee.city, employee.province, employee.postalCode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="employment" className="space-y-4">
          {(!employments || employments.length === 0) ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Belum ada data kepegawaian.
              </CardContent>
            </Card>
          ) : (
            employments.map((emp: any) => (
              <Card key={emp.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {emp.position?.name || emp.positionId}
                    {emp.isActive && (
                      <Badge variant="success" className="ml-2">Aktif</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Departemen</p>
                      <p>{emp.department?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipe</p>
                      <p>{emp.type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mulai</p>
                      <p>{emp.startDate ? new Date(emp.startDate).toLocaleDateString('id-ID') : '—'}</p>
                    </div>
                    {emp.endDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Selesai</p>
                        <p>{new Date(emp.endDate).toLocaleDateString('id-ID')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {(!documents || documents.length === 0) ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Belum ada dokumen.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {documents.map((doc: any) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">Lihat</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="k3" className="space-y-4">

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Pelatihan K3</CardTitle>
              <span className="text-lg font-bold">{k3Profile?.completedK3Trainings ?? 0}</span>
            </CardHeader>
            <CardContent>
              {k3Profile?.trainings?.length > 0 ? (
                <div className="space-y-1 text-sm">
                  {k3Profile.trainings.map((t: any) => (
                    <div key={t.id} className="flex justify-between"><span>{t.title}</span><span className="text-muted-foreground">{new Date(t.startDate).toLocaleDateString('id-ID')}</span></div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada pelatihan K3.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Riwayat Surat Peringatan</CardTitle>
            </CardHeader>
            <CardContent>
              {spHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada riwayat SP.</p>
              ) : (
                <div className="space-y-2">
                  {spHistory.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                      <span>
                        <Badge variant={c.spLevel === 'SP3' ? 'destructive' : c.spLevel === 'SP2' ? 'secondary' : 'success'} className="mr-2">{c.spLevel}</Badge>
                        {c.description}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(c.issuedDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
