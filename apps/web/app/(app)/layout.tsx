'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Nav from '@/app/components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, ready } = useAuth();

  useEffect(() => {
    if (ready && !token) router.replace('/login');
  }, [ready, token, router]);

  if (!ready || !token) return null;

  return (
    <>
      <Nav />
      <div className="container">{children}</div>
    </>
  );
}
