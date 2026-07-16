'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';

interface RowProps { label: string; value: string }

function Row({ label, value }: RowProps) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right max-w-[60%] font-medium">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading, error, refetch } = useProfile();
  const { data: documents = [] } = useQuery({
    queryKey: ['profile-documents'],
    queryFn: () => api.get<any[]>('/ess/profile/documents'),
  });

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={error?.message || 'Terjadi kesalahan'} onRetry={() => refetch()} />;
  if (!profile) return <div className="text-muted-foreground">Profil tidak ditemukan.</div>;

  const emp = profile.employments?.[0];
  const initials = profile.fullName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Informasi data diri dan kepegawaian</p>
      </div>

      <Card>
        <CardContent className="p-6 flex gap-5 items-start">
          <Avatar className="h-20 w-20 text-3xl">
            <AvatarImage src={profile.profilePicture} alt={profile.fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold m-0">{profile.fullName}</h2>
            <p className="text-sm text-muted-foreground m-0">{profile.employeeId} &middot; {profile.email}</p>
            <p className="text-sm text-muted-foreground m-0">
              {emp?.position?.name}{emp?.department?.name ? ` · ${emp.department.name}` : ''}
            </p>
            <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'destructive'}>{profile.status}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
          <CardContent>
            <Row label="Birth" value={profile.birthPlace ? `${profile.birthPlace}, ${profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('id-ID') : ''}` : profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('id-ID') : '—'} />
            <Row label="Gender" value={profile.gender || '—'} />
            <Row label="Religion" value={profile.religion || '—'} />
            <Row label="Marital Status" value={profile.maritalStatus} />
            <Row label="Blood Type" value={profile.bloodType || '—'} />
            <Row label="Phone" value={profile.phone || '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Address & Contact</CardTitle></CardHeader>
          <CardContent>
            <Row label="Address" value={profile.address || '—'} />
            <Row label="City" value={profile.city || '—'} />
            <Row label="Province" value={profile.province || '—'} />
            <Row label="Postal Code" value={profile.postalCode || '—'} />
            <Row label="Emergency Contact" value={profile.emergencyContact || '—'} />
            <Row label="Emergency Phone" value={profile.emergencyPhone || '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Employment</CardTitle></CardHeader>
          <CardContent>
            <Row label="Position" value={emp?.position?.name || '—'} />
            <Row label="Department" value={emp?.department?.name || '—'} />
            <Row label="Grade" value={emp?.grade?.name || '—'} />
            <Row label="Start Date" value={profile.startDate ? new Date(profile.startDate).toLocaleDateString('id-ID') : '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
          <CardContent>
            {documents.length === 0 && <p className="text-sm text-muted-foreground">Belum ada dokumen.</p>}
            {documents.map((d: any) => (
              <div key={d.id} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                <span className="font-medium">{d.type}: {d.fileName}</span>
                <Badge variant="outline" className="text-xs">{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
