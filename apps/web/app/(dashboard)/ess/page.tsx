'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEssDashboard, useClockIn, useClockOut } from '@/lib/hooks/ess';
import { useEnrollBiometric, useVerifyFace } from '@/lib/hooks/biometric';
import { fetchMyPpeCompliance } from '@/lib/api/employee-relations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import { FaceCapture } from '@/components/biometric/face-capture';
import { Clock, LogOut, CalendarDays, Wallet, Bell, User, ChevronRight, ScanFace, Loader2, MapPin, ShieldOff, ShieldAlert } from 'lucide-react';
import { getCurrentGeoFix, GeolocationError } from '@/lib/utils/geolocation';

const menuItems = [
  { href: '/ess/leave', label: 'Cuti', icon: CalendarDays, color: 'text-blue-600' },
  { href: '/ess/expense', label: 'Klaim', icon: Wallet, color: 'text-green-600' },
  { href: '/ess/k3', label: 'K3 & SP', icon: ShieldAlert, color: 'text-amber-600' },
  { href: '/ess/profile', label: 'Profil', icon: User, color: 'text-purple-600' },
  { href: '/ess/payslips', label: 'Payslip', icon: Bell, color: 'text-orange-600' },
];

interface DashboardData {
  employeeName?: string;
  date?: string;
  clockStatus?: string;
  clockInTime?: string;
  clockOutTime?: string;
  leaveBalance?: { label: string; used: number; total: number }[];
  latestPayslip?: { month: string; netPay: number };
  unreadNotifications?: number;
}

export default function EssDashboardPage() {
  const { data: raw, isLoading, error, refetch } = useEssDashboard();
  const clockInMut = useClockIn();
  const clockOutMut = useClockOut();
  const enrollMut = useEnrollBiometric();
  const verifyMut = useVerifyFace();
  const [clocking, setClocking] = useState(false);
  const [clockPhase, setClockPhase] = useState<'locating' | 'submitting' | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [faceClockOpen, setFaceClockOpen] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const { data: ppeCheck } = useQuery({
    queryKey: ['ppe-compliance', 'me'],
    queryFn: fetchMyPpeCompliance,
    enabled: raw && (raw as any)?.clockStatus !== 'CLOCKED_IN' && (raw as any)?.clockStatus !== 'CLOCKED_OUT',
    refetchInterval: 30_000,
  });

  const d = raw as DashboardData | undefined;
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleClock = async () => {
    setClocking(true);
    setStatus(null);
    try {
      setClockPhase('locating');
      const fix = await getCurrentGeoFix();
      const payload = {
        method: 'GPS',
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        clientTimestamp: fix.clientTimestamp,
      };
      setClockPhase('submitting');
      if (d?.clockStatus === 'CLOCKED_IN') {
        await clockOutMut.mutateAsync(payload);
      } else {
        await clockInMut.mutateAsync(payload);
      }
      setStatus({ kind: 'ok', msg: 'Presensi GPS berhasil dicatat.' });
    } catch (e) {
      const msg =
        e instanceof GeolocationError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Gagal melakukan presensi.';
      setStatus({ kind: 'err', msg });
    }
    setClockPhase(null);
    setClocking(false);
  };

  const handleEnrollCapture = async (result: { photo: string; embedding: number[] }) => {
    try {
      await enrollMut.mutateAsync({
        type: 'FACE',
        reference: JSON.stringify(result.embedding),
      });
      setStatus({ kind: 'ok', msg: 'Wajah berhasil didaftarkan untuk verifikasi.' });
    } catch {
      setStatus({ kind: 'err', msg: 'Gagal mendaftarkan wajah.' });
    }
    setEnrollOpen(false);
  };

  const handleFaceClockCapture = async (result: { photo: string; embedding: number[] }) => {
    setStatus(null);
    try {
      const v = await verifyMut.mutateAsync({ embedding: result.embedding });
      if (!v.matched) {
        setStatus({
          kind: 'err',
          msg: `Verifikasi wajah gagal (skor ${v.score.toFixed(2)}). Coba lagi atau gunakan cara lain.`,
        });
        setFaceClockOpen(false);
        return;
      }
      if (d?.clockStatus === 'CLOCKED_IN') {
        await clockOutMut.mutateAsync({ method: 'FACE', embedding: result.embedding, photo: result.photo });
      } else {
        await clockInMut.mutateAsync({ method: 'FACE', embedding: result.embedding, photo: result.photo });
      }
      setStatus({ kind: 'ok', msg: 'Verifikasi wajah berhasil. Presensi dicatat.' });
    } catch {
      setStatus({ kind: 'err', msg: 'Verifikasi wajah gagal.' });
    }
    setFaceClockOpen(false);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-md pb-20">
      {/* Greeting Card */}
      <Card className="rounded-none border-x-0 border-t-0 p-4 shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Selamat Datang,</p>
            <h1 className="text-xl font-bold">{d?.employeeName ?? 'Karyawan'}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{today}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
        </div>
      </Card>

      {/* Clock In/Out Button */}
      <div className="px-4 py-6">

        {ppeCheck?.blocked && d?.clockStatus !== 'CLOCKED_IN' && d?.clockStatus !== 'CLOCKED_OUT' && (
          <div className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <ShieldOff className="h-5 w-5 shrink-0 mt-0.5" /><span>{ppeCheck.reason}</span>
          </div>
        )}

        <Button
          onClick={handleClock}
          disabled={clocking || (d?.clockStatus !== 'CLOCKED_IN' && d?.clockStatus !== 'CLOCKED_OUT' && !!ppeCheck?.blocked)}
          className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl text-lg shadow-lg"
        >
          {clockPhase === 'locating' ? (
            <MapPin className="h-10 w-10 animate-pulse" />
          ) : clockPhase === 'submitting' ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : ppeCheck?.blocked && d?.clockStatus !== 'CLOCKED_IN' && d?.clockStatus !== 'CLOCKED_OUT' ? (
            <ShieldOff className="h-10 w-10" />
          ) : (
            <Clock className={`h-10 w-10 ${d?.clockStatus === 'CLOCKED_IN' ? 'animate-pulse' : ''}`} />
          )}
          <span className="text-base font-semibold">
            {clockPhase === 'locating'
              ? 'Mengambil lokasi...'
              : clockPhase === 'submitting'
                ? 'Memproses...'
                : ppeCheck?.blocked && d?.clockStatus !== 'CLOCKED_IN' && d?.clockStatus !== 'CLOCKED_OUT'
                  ? 'APD Tidak Memenuhi'
                  : d?.clockStatus === 'CLOCKED_IN'
                    ? 'Clock Out'
                    : 'Clock In'}
          </span>
          {d?.clockStatus === 'CLOCKED_IN' && d?.clockInTime && (
            <span className="text-xs opacity-80">Masuk {d.clockInTime}</span>
          )}
        </Button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setFaceClockOpen(true)} disabled={clocking || !!ppeCheck?.blocked}>
            <ScanFace className="mr-2 h-4 w-4" /> Presensi Wajah
          </Button>
          <Button variant="outline" onClick={() => setEnrollOpen(true)} disabled={enrollMut.isPending}>
            <ScanFace className="mr-2 h-4 w-4" /> Daftar Wajah
          </Button>
        </div>

        {status && (
          <p
            className={`mt-3 rounded-md p-2 text-center text-xs ${
              status.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {status.msg}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="space-y-3 px-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Sisa Cuti</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex gap-2">
            {(d?.leaveBalance ?? []).slice(0, 3).map((lb, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {lb.label}: {lb.used}/{lb.total}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Payslip Terakhir</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {d?.latestPayslip ? (
            <p className="mt-1 text-lg font-bold">
              Rp {d.latestPayslip.netPay.toLocaleString('id-ID')}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{d.latestPayslip.month}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Belum ada payslip</p>
          )}
        </Card>

        <Link href="/ess/notifications">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">Notifikasi</span>
              </div>
              {d?.unreadNotifications ? (
                <Badge variant="destructive" className="text-xs">{d.unreadNotifications}</Badge>
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Card>
        </Link>

        {(d as any)?.k3Profile && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium">Profil K3</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{((d as any)?.k3Profile?.completedK3Trainings ?? 0)} Pelatihan</Badge>
              <Badge variant="secondary" className="text-xs">{((d as any)?.k3Profile?.activePpeCount ?? 0)} APD Aktif</Badge>
              {(d as any)?.k3Profile?.activeSp && (
                <Badge variant="destructive" className="text-xs">{(d as any).k3Profile.activeSp.spLevel}</Badge>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* 2x2 Menu Grid */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="flex cursor-pointer flex-col items-center gap-2 p-5 transition-colors hover:bg-accent">
                <item.icon className={`h-8 w-8 ${item.color}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <FaceCapture
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        onCapture={handleEnrollCapture}
        title="Daftarkan Wajah"
      />
      <FaceCapture
        open={faceClockOpen}
        onOpenChange={setFaceClockOpen}
        onCapture={handleFaceClockCapture}
        title="Verifikasi Wajah"
      />

      {/* Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background">
        <div className="flex justify-around py-2">
          {[
            { href: '/ess', label: 'Home', icon: Clock, active: true },
            { href: '/ess/k3', label: 'K3', icon: ShieldAlert, active: false },
            { href: '/ess/leave', label: 'Cuti', icon: CalendarDays, active: false },
            { href: '/ess/profile', label: 'Profil', icon: User, active: false },
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
