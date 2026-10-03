'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield,
  Palette,
  Activity,
  FileText,
  Fingerprint,
  Flag,
  Settings,
  Building2,
  Workflow,
  ListTodo,
  Users,
  Upload,
} from 'lucide-react';

const adminModules = [
  { href: '/admin/users', label: 'Pengguna', icon: Users, desc: 'Kelola pengguna dan akses sistem' },
  { href: '/admin/roles', label: 'Role & Permission', icon: Shield, desc: 'Kelola role dan hak akses pengguna' },
  { href: '/admin/branding', label: 'Branding Tenant', icon: Palette, desc: 'Kustomisasi tampilan dan warna tenant' },
  { href: '/admin/platform/health', label: 'System Health', icon: Activity, desc: 'CPU, memory, disk, dan metrik operasional' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText, desc: 'Riwayat perubahan data dalam sistem' },
  { href: '/admin/biometric-enrollment', label: 'Enrollment Biometrik', icon: Fingerprint, desc: 'Pendaftaran data biometrik karyawan' },
  { href: '/admin/anti-spoof-settings', label: 'Anti Fake-GPS', icon: Shield, desc: 'Pengaturan deteksi kecurangan presensi' },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: Flag, desc: 'Aktifkan/nonaktifkan fitur secara dinamis' },
  { href: '/admin/leave-types', label: 'Tipe Cuti & Izin', icon: ListTodo, desc: 'Konfigurasi jenis cuti dan izin' },
  { href: '/admin/tenants', label: 'Tenants', icon: Building2, desc: 'Manajemen multi-tenant' },
  { href: '/admin/integrations', label: 'Integrations', icon: Workflow, desc: 'Integrasi dengan sistem eksternal' },
  { href: '/admin/workflows', label: 'Workflows', icon: Workflow, desc: 'Alur persetujuan dan notifikasi' },
  { href: '/admin/import', label: 'Import CSV', icon: Upload, desc: 'Impor data karyawan dari file CSV' },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administrasi</h1>
        <p className="text-sm text-muted-foreground">Panel administrasi sistem</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {adminModules.map((m) => (
          <Link key={m.href} href={m.href} className="no-underline">
            <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <m.icon className="h-4 w-4 text-primary" />
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
