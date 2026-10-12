'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AccessDenied({ permission }: { permission?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-bold">Akses Ditolak</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Anda tidak memiliki akses ke halaman ini.
          {permission ? (
            <>
              {' '}Dibutuhkan permission <code className="rounded bg-muted px-1">{permission}</code>.
            </>
          ) : null}{' '}
          Hubungi HR admin jika Anda seharusnya memiliki akses.
        </p>
        <Link href="/helpdesk">
          <Button variant="outline">Kembali ke Helpdesk</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
