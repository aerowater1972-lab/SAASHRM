'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEssProfile, useEssPreferences, useUpdateEssPreferences } from '@/lib/hooks/ess';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/data-states';
import { Clock, CalendarDays, Wallet, User, Bell, ChevronLeft } from 'lucide-react';

interface ProfileData {
  fullName?: string;
  employeeId?: string;
  nik?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  joinDate?: string;
}

interface PreferencesData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EssProfilePage() {
  const { data: rawProfile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useEssProfile();
  const { data: rawPrefs, isLoading: prefsLoading, error: prefsError, refetch: refetchPrefs } = useEssPreferences();
  const updatePrefs = useUpdateEssPreferences();

  const profile = rawProfile as ProfileData | undefined;
  const prefs = (rawPrefs ?? {}) as PreferencesData;

  const [emailNotifications, setEmailNotifications] = useState<boolean>(false);
  const [pushNotifications, setPushNotifications] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    if (rawPrefs) {
      setEmailNotifications(!!prefs.emailNotifications);
      setPushNotifications(!!prefs.pushNotifications);
      setSaved(false);
    }
  }, [rawPrefs, prefs.emailNotifications, prefs.pushNotifications]);

  const isLoading = profileLoading || prefsLoading;
  const error = profileError || prefsError;

  const handleSave = async () => {
    try {
      await updatePrefs.mutateAsync({ emailNotifications, pushNotifications });
      setSaved(true);
    } catch {
      /* ignore */
    }
  };

  const profileRows: { label: string; value?: string }[] = [
    { label: 'NIK', value: profile?.nik ?? profile?.employeeId },
    { label: 'Email', value: profile?.email },
    { label: 'Telepon', value: profile?.phone },
    { label: 'Posisi', value: profile?.position },
    { label: 'Departemen', value: profile?.department },
    { label: 'Tanggal Bergabung', value: formatDate(profile?.joinDate) },
  ];

  return (
    <div className="mx-auto max-w-md pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-3">
        <Link href="/ess" aria-label="Kembali">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </Link>
        <h1 className="text-lg font-bold">Profil</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4 p-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState
          onRetry={() => {
            refetchProfile();
            refetchPrefs();
          }}
        />
      ) : (
        <>
          {/* Profile Card */}
          <Card className="rounded-none border-x-0 border-t-0 p-5 shadow-none">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {getInitials(profile?.fullName)}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-3 text-xl font-bold">{profile?.fullName ?? 'Karyawan'}</h2>
              <p className="text-sm text-muted-foreground">{profile?.employeeId ?? profile?.nik ?? '-'}</p>
            </div>
          </Card>

          {/* Detail Card */}
          <div className="px-4 py-2">
            <Card className="divide-y p-2">
              {profileRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-2 py-3">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="max-w-[60%] truncate text-sm font-medium text-right">{row.value ?? '-'}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Preferences Card */}
          <div className="px-4 py-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Preferensi</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notif" className="text-sm">Notifikasi Email</Label>
                    <p className="text-xs text-muted-foreground">Terima pemberitahuan via email</p>
                  </div>
                  <Switch
                    id="email-notif"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notif" className="text-sm">Notifikasi Push</Label>
                    <p className="text-xs text-muted-foreground">Terima pemberitahuan push di perangkat</p>
                  </div>
                  <Switch
                    id="push-notif"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  {saved && !updatePrefs.isPending && (
                    <Badge variant="secondary" className="text-xs">Tersimpan</Badge>
                  )}
                </div>
                <Button onClick={handleSave} disabled={updatePrefs.isPending}>
                  {updatePrefs.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background">
        <div className="flex justify-around py-2">
          {[
            { href: '/ess', label: 'Home', icon: Clock, active: false },
            { href: '/ess/leave', label: 'Cuti', icon: CalendarDays, active: false },
            { href: '/ess/expense', label: 'Klaim', icon: Wallet, active: false },
            { href: '/ess/profile', label: 'Profil', icon: User, active: true },
            { href: '/ess/notifications', label: 'Notif', icon: Bell, active: false },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1 ${item.active ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
