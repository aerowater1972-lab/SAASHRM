'use client';

import { useEffect, useState } from 'react';
import { hasPermission } from '@/lib/api';

/**
 * Reactive wrapper around `hasPermission()`.
 * `hasPermission` reads in-memory permissions synchronously, so after
 * `restoreSession()` completes (post-reload) the value can flip from
 * false -> true. This hook re-checks on mount + on focus/visibility
 * change so gated UI appears without a manual refresh.
 *
 * Returns `{ allowed, ready }` — render a skeleton while `!ready`
 * to avoid flashing AccessDenied on first paint.
 */
export function usePermission(perm: string | string[]): { allowed: boolean; ready: boolean } {
  const key = Array.isArray(perm) ? perm.join(',') : perm;
  const [state, setState] = useState({ allowed: false, ready: false });

  useEffect(() => {
    const list = key.split(',');
    const check = () =>
      setState({ allowed: list.some((p) => hasPermission(p)), ready: true });
    check();
    const t = setTimeout(check, 500);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearTimeout(t);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
