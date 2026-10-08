'use client';

import { useEffect } from 'react';
import { prefetchFaceModels } from '@/lib/utils/face-embedding';

/**
 * PWA bootstrap: registers the service worker, relays Background Sync
 * flush requests, and prefetches face models when idle on unmetered
 * connections (WiFi) so biometric enrollment stays snappy on Android.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);

      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === 'FLUSH_CLOCK_OUTBOX') {
          window.dispatchEvent(new Event('flexy:flush-clock'));
        }
      };
      navigator.serviceWorker.addEventListener('message', onMessage);

      // Fallback flush trigger for browsers without Background Sync.
      const flush = () => window.dispatchEvent(new Event('flexy:flush-clock'));
      window.addEventListener('online', flush);
      return () => {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        window.removeEventListener('online', flush);
      };
    }

    const flush = () => window.dispatchEvent(new Event('flexy:flush-clock'));
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  useEffect(() => {
    // Prefetch ~7MB face models only when idle AND on an unmetered link.
    const maybePrefetch = () => {
      try {
        const conn = (navigator as unknown as {
          connection?: { saveData?: boolean; type?: string; effectiveType?: string };
        }).connection;
        if (conn?.saveData) return;
        if (conn?.type && conn.type !== 'wifi' && conn.type !== 'ethernet' && conn.type !== 'unknown') return;
        void prefetchFaceModels();
      } catch {
        /* best-effort only */
      }
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void, o?: object) => number }).requestIdleCallback(
        maybePrefetch,
        { timeout: 15000 },
      );
      return () => {
        (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }
    return undefined;
  }, []);

  return null;
}
