import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="text-8xl font-bold text-muted-foreground/30 mb-4">404</div>
      <h1 className="text-2xl font-bold mb-2">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>
      <Link href="/dashboard">
        <Button>Ke Dashboard</Button>
      </Link>
    </div>
  );
}
