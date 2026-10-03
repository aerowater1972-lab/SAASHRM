'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
}

async function fetchBranding(): Promise<BrandingData | null> {
  try {
    return await api.get<BrandingData>('/admin/branding');
  } catch {
    return null;
  }
}

export function BrandingInjector({ children }: { children: React.ReactNode }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('flexy.accessToken') : null;
  const { data } = useQuery({
    queryKey: ['branding'],
    queryFn: fetchBranding,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', data.primaryColor || '#2563EB');
    root.style.setProperty('--brand-secondary', data.secondaryColor || '#7C3AED');
  }, [data]);

  return <>{children}</>;
}
