'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LocationPoint } from '@/types/api';

interface GPSLocationProps {
  onLocationUpdate: (location: LocationPoint) => void;
  onError?: (error: string) => void;
  highAccuracy?: boolean;
  showMap?: boolean;
}

export default function GPSLocation({
  onLocationUpdate,
  onError,
  highAccuracy = true,
  showMap = false,
}: GPSLocationProps) {
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    requestPermission();
    return () => {
      if (watchIdRef.current !== null) {
        Location.stopLocationUpdatesAsync(watchIdRef.current);
      }
    };
  }, []);

  const requestPermission = async () => {
    try {
      let status: Location.PermissionStatus;

      if (Platform.OS === 'android') {
        const { status: permStatus } = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Izin Lokasi',
            message: 'Aplikasi memerlukan akses lokasi GPS untuk absensi',
            buttonNeutral: 'Tanya Nanti',
            buttonNegative: 'Tolak',
            buttonPositive: 'Izinkan',
          }
        );
        status = permStatus === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';

        // Also request background location for Android 10+
        if (Platform.Version >= 29) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
          );
        }
      } else {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        status = permStatus;
      }

      setPermission(status);

      if (status === 'granted') {
        startLocationTracking();
      } else {
        setError('Izin lokasi ditolak');
        onError?.('Izin lokasi ditolak');
      }
    } catch (err) {
      console.error('Permission error:', err);
      setPermission('denied');
      setError('Gagal meminta izin lokasi');
      onError?.('Gagal meminta izin lokasi');
    }
  };

  const startLocationTracking = async () => {
    try {
      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeout: 15000,
        maximumAge: 10000,
      });

      await processLocation(initialLocation);

      // Start continuous watching
      watchIdRef.current = await Location.watchPositionAsync(
        {
          accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 10, // 10 meters
        },
        processLocation
      );
    } catch (err) {
      console.error('Location tracking error:', err);
      setError('Gagal memulai pelacakan lokasi');
      onError?.('Gagal memulai pelacakan lokasi');
    }
  };

  const processLocation = async (loc: Location.LocationObject) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 10000) return; // Min 10s between updates
    lastUpdateRef.current = now;

    try {
      // Reverse geocode to get address
      let address: string | undefined;
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (addresses.length > 0) {
          const addr = addresses[0];
          address = [
            addr.street,
            addr.district,
            addr.city,
            addr.region,
            addr.postalCode,
          ].filter(Boolean).join(', ');
        }
      } catch {
        // Ignore geocoding errors
      }

      const locationPoint: LocationPoint = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || undefined,
        altitude: loc.coords.altitude || undefined,
        address,
        timestamp: new Date(loc.timestamp).toISOString(),
      };

      setLocation(locationPoint);
      setAccuracy(loc.coords.accuracy || null);
      onLocationUpdate(locationPoint);
    } catch (err) {
      console.error('Process location error:', err);
    }
  };

  const refreshLocation = useCallback(async () => {
    if (fetching) return;
    setFetching(true);
    setError(null);

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeout: 15000,
      });
      await processLocation(loc);
    } catch (err) {
      setError('Gagal mendapatkan lokasi');
      onError?.('Gagal mendapatkan lokasi');
    } finally {
      setFetching(false);
    }
  }, [fetching, highAccuracy, onError]);

  const openInMaps = () => {
    if (location) {
      Location.openInMaps({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  };

  if (permission === 'denied') {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="location-off" size={64} color="#dc2626" />
          <Text style={styles.permissionTitle}>Izin Lokasi Diperlukan</Text>
          <Text style={styles.permissionText}>
            Aplikasi memerlukan akses lokasi GPS untuk verifikasi absensi.
            Silakan izinkan akses lokasi di pengaturan perangkat.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Buka Pengaturan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={permission === 'granted' ? 'location' : 'location-off'}
              size={24}
              color={permission === 'granted' ? '#059669' : '#dc2626'}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {permission === 'granted' ? 'Lokasi Aktif' : 'Menunggu Izin'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {permission === 'granted'
                ? location
                  ? `Akurasi: ${accuracy ? `${Math.round(accuracy)}m` : 'Memproses...'}`
                  : 'Mendeteksi lokasi...'
                : 'Izinkan akses lokasi untuk melanjutkan'}
            </Text>
          </View>
        </View>

        {location && (
          <View style={styles.locationDetails}>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <Text style={styles.coordValue}>{location.latitude.toFixed(6)}</Text>
            </View>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <Text style={styles.coordValue}>{location.longitude.toFixed(6)}</Text>
            </View>
            {location.accuracy && (
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Akurasi</Text>
                <Text style={styles.coordValue}>±{Math.round(location.accuracy)} meter</Text>
              </View>
            )}
            {location.address && (
              <View style={styles.addressContainer}>
                <Ionicons name="map" size={16} color="#64748b" />
                <Text style={styles.addressText}>{location.address}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshLocation}
            disabled={fetching}
            activeOpacity={0.8}
          >
            {fetching ? (
              <ActivityIndicator color="#1e3a8a" size="small" />
            ) : (
              <Ionicons name="refresh" size={20} color="#1e3a8a" />
            )}
          </TouchableOpacity>

          {showMap && location && (
            <TouchableOpacity style={styles.mapButton} onPress={openInMaps} activeOpacity={0.8}>
              <Ionicons name="navigate" size={20} color="#1e3a8a" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  permissionText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 8,
  },
  permissionButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  locationDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  coordLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
  },
});