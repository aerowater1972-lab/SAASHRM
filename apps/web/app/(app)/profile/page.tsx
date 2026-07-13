'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useProfile } from '@/hooks/use-profile';
import { Card } from '@/components/ui';

interface Employment {
  id: string;
  department?: { id: string; name: string };
  position?: { id: string; name: string };
  grade?: { id: string; name: string };
}

interface Document {
  id: string;
  type: string;
  fileName: string;
  status: string;
  createdAt: string;
}

interface EmployeeProfile {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: string;
  religion?: string;
  maritalStatus: string;
  bloodType?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  profilePicture?: string;
  status: string;
  startDate?: string;
  employments: Employment[];
  documents: Document[];
}

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();
  const { data: documents = [] } = useQuery({
    queryKey: ['profile-documents'],
    queryFn: () => api.get<Document[]>('/ess/profile/documents'),
  });

  if (isLoading) return <p className="text-gray-500 dark:text-gray-400">Loading…</p>;
  if (error) return <div className="text-red-500 text-sm mb-3">{error?.message}</div>;
  if (!profile) return <p>Not found</p>;

  const emp = profile.employments?.[0];

  return (
    <div>
      <h2 className="mt-0">My Profile</h2>

      <Card className="max-w-[700px] mb-6 flex gap-5 items-start">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
          {profile.profilePicture
            ? <img src={profile.profilePicture} alt="" className="w-full h-full object-cover" />
            : profile.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="m-0">{profile.fullName}</h3>
          <p className="m-0.5 text-gray-500 dark:text-gray-400 text-xs">
            {profile.employeeId} · {profile.email}
          </p>
          <p className="m-0.5 text-xs">
            {emp?.position?.name} {emp?.department?.name ? `· ${emp.department.name}` : ''}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded ${
            profile.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {profile.status}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6 max-w-[700px]">
        <Card>
          <h4 className="m-0 mb-3">Personal Information</h4>
          <InfoRow label="Birth" value={profile.birthPlace ? `${profile.birthPlace}, ${profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('id-ID') : ''}` : profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('id-ID') : '—'} />
          <InfoRow label="Gender" value={profile.gender || '—'} />
          <InfoRow label="Religion" value={profile.religion || '—'} />
          <InfoRow label="Marital Status" value={profile.maritalStatus} />
          <InfoRow label="Blood Type" value={profile.bloodType || '—'} />
          <InfoRow label="Phone" value={profile.phone || '—'} />
        </Card>

        <Card>
          <h4 className="m-0 mb-3">Address & Contact</h4>
          <InfoRow label="Address" value={profile.address || '—'} />
          <InfoRow label="City" value={profile.city || '—'} />
          <InfoRow label="Province" value={profile.province || '—'} />
          <InfoRow label="Postal Code" value={profile.postalCode || '—'} />
          <InfoRow label="Emergency Contact" value={profile.emergencyContact || '—'} />
          <InfoRow label="Emergency Phone" value={profile.emergencyPhone || '—'} />
        </Card>

        <Card>
          <h4 className="m-0 mb-3">Employment</h4>
          <InfoRow label="Position" value={emp?.position?.name || '—'} />
          <InfoRow label="Department" value={emp?.department?.name || '—'} />
          <InfoRow label="Grade" value={emp?.grade?.name || '—'} />
          <InfoRow label="Start Date" value={profile.startDate ? new Date(profile.startDate).toLocaleDateString('id-ID') : '—'} />
        </Card>

        <Card>
          <h4 className="m-0 mb-3">Documents</h4>
          {documents.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-xs m-0">No documents</p>}
          {documents.map((d: any) => (
            <div key={d.id} className="flex justify-between text-xs mb-1.5">
              <span>{d.type}: {d.fileName}</span>
              <span className="text-gray-500 dark:text-gray-400">{d.status}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs mb-2">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right max-w-[60%]">{value}</span>
    </div>
  );
}
