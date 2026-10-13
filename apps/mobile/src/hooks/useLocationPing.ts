import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform, PermissionsAndroid } from 'react-native';
import { liveTrackingApi } from '@/lib/api';

/**
 * Foreground GPS ping client untuk karyawan lapangan.
 * Memantau posisi & mengirim ping ke `/attendance/live-tracking/ping`
 * sesuai interval (default dari server / 15 menit). Hanya aktif saat
 * `enabled` true (mis. user adalah field worker & tracking diaktifkan).
 *
 * Catatan: pengiriman di foreground (aplikasi terbuka). Untuk background
 * penuh perlu expo-task-manager + izin latar belakang (belum dipasang).
 */
export function useLocationPing(enabled: boolean, intervalMs = 15 * 60 * 1000) {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const lastSentRef = useRef<number>(0);

  const requestPermission = useCallback(async () => {
    try {
      let status: Location.PermissionStatus;
      if (Platform.OS === 'android') {
        const perm = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: 'Izin Lokasi', message: 'Dibutuhkan untuk melacak aktivitas lapangan', buttonPositive: 'Izinkan' },
        );
        status = perm === 'granted' ? Location.PermissionStatus.GRANTED : Location.PermissionStatus.DENIED;
      } else {
        const { status: s } = await Location.requestForegroundPermissionsAsync();
        status = s;
      }
      setPermission(status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied');
      return status === Location.PermissionStatus.GRANTED;
    } catch (e: any) {
      setError(e?.message ?? 'Gagal meminta izin lokasi');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const ok = await requestPermission();
      if (!ok || cancelled) return;
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: intervalMs },
        async (loc) => {
          const now = Date.now();
          // Throttle: kirim maksimal sekali per interval.
          if (now - lastSentRef.current < intervalMs) return;
          lastSentRef.current = now;
          try {
            setSending(true);
            await liveTrackingApi.recordPing({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              accuracyMeters: loc.coords.accuracy ?? undefined,
              recordedAt: new Date(loc.timestamp).toISOString(),
            });
            setLastPingAt(new Date().toISOString());
            setError(null);
          } catch (e: any) {
            setError(e?.message ?? 'Gagal mengirim lokasi');
          } finally {
            setSending(false);
          }
        },
      );
    })();
    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [enabled, intervalMs, requestPermission]);

  return { permission, sending, lastPingAt, error, requestPermission };
}
