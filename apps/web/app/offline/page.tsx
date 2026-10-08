import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WifiOff } from 'lucide-react';

export const metadata = {
  title: 'Offline — Flexy HRMS',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Anda sedang offline</h1>
        <p className="text-sm text-muted-foreground">
          Periksa koneksi internet Anda. Presensi clock in/out yang dibuat
          offline tetap tersimpan di perangkat dan terkirim otomatis.
        </p>
        <Button asChild>
          <Link href="/dashboard">Coba lagi</Link>
        </Button>
      </div>
    </div>
  );
}
