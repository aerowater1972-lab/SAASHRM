'use client';

import type { ReactNode } from 'react';
import { usePermission } from '@/lib/hooks/use-permission';
import { AccessDenied } from '@/components/access-denied';
import { PageSkeleton } from '@/components/ui/data-states';

export function RequirePermission({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) {
  const { allowed, ready } = usePermission(permission);
  if (!ready) return <PageSkeleton />;
  if (!allowed) {
    const label = Array.isArray(permission) ? permission.join(' / ') : permission;
    return <AccessDenied permission={label} />;
  }
  return <>{children}</>;
}
