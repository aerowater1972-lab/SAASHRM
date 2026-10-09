'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useAttendanceStore } from '@/store/attendanceStore';
import { useBiometricStore } from '@/store/biometricStore';
import { useSyncStore } from '@/store/syncStore';
import styles from './AttendanceScreen.style';
import { colors } from '@/lib/theme';
import { AttendanceRecord, LocationPoint } from '@/types/api';
import FaceCapture from '@/components/biometric/FaceCapture';
import GPSLocation from '@/components/location/GPSLocation';

const { primary, primaryLight, success, warning, danger, background, card, text, textSecondary, border } = colors;

type AttendanceStatus = 'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'ON_LEAVE' | 'WFH';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; icon: string }> = {
  PRESENT: { label: 'Hadir', color: success, icon: 'checkmark-circle' },
  LATE: { label: 'Terlambat', color: warning, icon: 'time' },
  EARLY_LEAVE: { label: 'Pulang Cepat', color: warning, icon: 'exit' },
  ABSENT: { label: 'Tidak Hadir', color: danger, icon: 'close-circle' },
  ON_LEAVE: { label: 'Cuti', color: '#2563eb', icon: 'calendar-clear' },
  WFH: { label: 'WFH', color: '#7c3aed', icon: 'wifi' },
};

export default function AttendanceScreen() {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const { todayRecord, fetchTodayRecord, checkIn, checkOut, isLoading: attendanceLoading } = useAttendanceStore();
  const { isEnrolled, checkEnrollmentStatus, verifyFace, clearVerifyResult } = useBiometricStore();
  const { addToQueue, processQueue } = useSyncStore();
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [showGPSLocation, setShowGPSLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchTodayRecord(),
      checkEnrollmentStatus(),
    ]);
    setRefreshing(false);
  }, [fetchTodayRecord, checkEnrollmentStatus]);

  useEffect(() => {
    loadData();
    requestPermissions();
  }, [loadData]);

  const requestPermissions = async () => {
    // Location permission
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locStatus);

    // Camera permission
    const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(camStatus);
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      Alert.alert('Lokasi Diperlukan', 'Silakan tunggu hingga lokasi GPS terdeteksi atau izinkan akses lokasi.');
      return;
    }

    if (!isEnrolled) {
      Alert.alert('Wajah Belum Terdaftar', 'Silakan daftarkan wajah Anda terlebih dahulu di menu Pengaturan > Biometrik.');
      return;
    }

    setShowFaceCapture(true);
  };

  const handleCheckOut = async () => {
    if (!currentLocation) {
      Alert.alert('Lokasi Diperlukan', 'Silakan tunggu hingga lokasi GPS terdeteksi atau izinkan akses lokasi.');
      return;
    }

    if (!isEnrolled) {
      Alert.alert('Wajah Belum Terdaftar', 'Silakan daftarkan wajah Anda terlebih dahulu di menu Pengaturan > Biometrik.');
      return;
    }

    setShowFaceCapture(true);
  };

  const onFaceVerified = async (embedding: number[], isCheckIn: boolean) => {
    const { success, confidence } = await verifyFace(embedding);

    if (!success) {
      Alert.alert('Verifikasi Gagal', 'Wajah tidak dikenali. Silakan coba lagi dengan pencayaan yang lebih baik.');
      return;
    }

    try {
      if (isCheckIn) {
        setCheckingIn(true);
        await checkIn({
          latitude: currentLocation!.latitude,
          longitude: currentLocation!.longitude,
          accuracy: currentLocation!.accuracy,
          address: currentLocation!.address,
          method: 'FACE',
        });
      } else {
        setCheckingOut(true);
        await checkOut({
          latitude: currentLocation!.latitude,
          longitude: currentLocation!.longitude,
          accuracy: currentLocation!.accuracy,
          address: currentLocation!.address,
          method: 'FACE',
        });
      }
      Alert.alert('Berhasil', isCheckIn ? 'Check-in berhasil!' : 'Check-out berhasil!');
      loadData();
    } catch (error: any) {
      // Add to sync queue for offline support
      addToQueue({
        type: isCheckIn ? 'ATTENDANCE_CHECKIN' : 'ATTENDANCE_CHECKOUT',
        payload: {
          latitude: currentLocation!.latitude,
          longitude: currentLocation!.longitude,
          accuracy: currentLocation!.accuracy,
          address: currentLocation!.address,
          method: 'FACE',
        },
      });
      Alert.alert('Disisipkan ke Antrean', 'Anda offline. Data akan disinkronkan saat online kembali.');
    } finally {
      setCheckingIn(false);
      setCheckingOut(false);
      clearVerifyResult();
    }
  };

  const canCheckIn = !todayRecord?.checkInTime;
  const canCheckOut = todayRecord?.checkInTime && !todayRecord?.checkOutTime;

  const status = todayRecord?.status || 'ABSENT';
  const statusConfig = STATUS_CONFIG[status];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: statusConfig.color }]}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusLabel}>Status Hari Ini</Text>
          <View style={styles.statusBadge}>
            <Ionicons name={statusConfig.icon} size={20} color="#fff" />
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </View>
        </View>
        <View style={styles.statusTimes}>
          {todayRecord?.checkInTime && (
            <View style={styles.timeItem}>
              <Ionicons name="login" size={18} color="#fff" opacity={0.9} />
              <View>
                <Text style={styles.timeLabel}>Check-in</Text>
                <Text style={styles.timeValue}>{formatTime(todayRecord.checkInTime)}</Text>
              </View>
            </View>
          )}
          {todayRecord?.checkOutTime && (
            <View style={styles.timeItem}>
              <Ionicons name="logout" size={18} color="#fff" opacity={0.9} />
              <View>
                <Text style={styles.timeLabel}>Check-out</Text>
                <Text style={styles.timeValue}>{formatTime(todayRecord.checkOutTime)}</Text>
              </View>
            </View>
          )}
          {!todayRecord?.checkInTime && (
            <View style={styles.timeItem}>
              <Ionicons name="help-circle" size={18} color="#fff" opacity={0.7} />
              <View>
                <Text style={styles.timeLabel}>Belum Check-in</Text>
                <Text style={styles.timeValue}>Tap tombol di bawah untuk mulai</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Location Status */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location" size={20} color={primary} />
          <Text style={styles.sectionTitle}>Lokasi GPS</Text>
        </View>
        <View style={styles.locationCard}>
          <View style={styles.locationStatus}>
            <View style={[
              styles.locationDot,
              { backgroundColor: locationPermission === 'granted' ? '#059669' : '#dc2626' }
            ]} />
            <Text style={styles.locationText}>
              {locationPermission === 'granted'
                ? currentLocation
                  ? `Lat: ${currentLocation.latitude.toFixed(6)}, Lng: ${currentLocation.longitude.toFixed(6)}`
                  : 'Mendeteksi lokasi...'
                : 'Izin lokasi ditolak'}
            </Text>
          </View>
          {currentLocation?.address && (
            <Text style={styles.addressText}>{currentLocation.address}</Text>
          )}
        </View>
      </View>

      {/* Biometric Status */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="scan-face" size={20} color={primary} />
          <Text style={styles.sectionTitle}>Verifikasi Wajah</Text>
        </View>
        <View style={styles.biometricCard}>
          <View style={styles.biometricStatus}>
            <View style={[
              styles.biometricDot,
              { backgroundColor: isEnrolled ? '#059669' : '#dc2626' }
            ]} />
            <Text style={styles.biometricText}>
              {isEnrolled ? 'Wajah terdaftar ✓' : 'Wajah belum terdaftar'}
            </Text>
          </View>
          {!isEnrolled && (
            <TouchableOpacity
              style={styles.enrollButton}
              onPress={() => router.push('/(dashboard)/settings/biometric')}
            >
              <Text style={styles.enrollButtonText}>Daftar Wajah</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          testID="checkin-button"
          accessibilityLabel="Check In"
          style={[
            styles.actionButton,
            styles.checkInButton,
            !canCheckIn && styles.actionButtonDisabled,
            checkingIn && styles.actionButtonLoading,
          ]}
          onPress={handleCheckIn}
          disabled={!canCheckIn || checkingIn || checkingOut}
          activeOpacity={0.8}
        >
          {checkingIn ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="login" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Check In</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="checkout-button"
          accessibilityLabel="Check Out"
          style={[
            styles.actionButton,
            styles.checkOutButton,
            !canCheckOut && styles.actionButtonDisabled,
            checkingOut && styles.actionButtonLoading,
          ]}
          onPress={handleCheckOut}
          disabled={!canCheckOut || checkingIn || checkingOut}
          activeOpacity={0.8}
        >
          {checkingOut ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="logout" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Check Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ringkasan Bulan Ini</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>22</Text>
            <Text style={styles.statLabel}>Hari Kerja</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>19</Text>
            <Text style={styles.statLabel}>Hadir</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Terlambat</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Cuti</Text>
          </View>
        </View>
      </View>

      {/* Recent Records */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Riwayat Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard)/attendance/history')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        {attendanceLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          todayRecord ? (
            <View style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordDate}>
                  <Text style={styles.recordDay}>15</Text>
                  <Text style={styles.recordMonth}>JAN</Text>
                </View>
                <View style={styles.recordStatus}>
                  <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                  <Text style={[styles.recordStatusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              </View>
              <View style={styles.recordDetails}>
                {todayRecord.checkInTime && (
                  <View style={styles.detailItem}>
                    <Ionicons name="login" size={16} color={textSecondary} />
                    <Text style={styles.detailText}>Masuk: {formatTime(todayRecord.checkInTime)}</Text>
                  </View>
                )}
                {todayRecord.checkOutTime && (
                  <View style={styles.detailItem}>
                    <Ionicons name="logout" size={16} color={textSecondary} />
                    <Text style={styles.detailText}>Pulang: {formatTime(todayRecord.checkOutTime)}</Text>
                  </View>
                )}
                {todayRecord.workHours && (
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={16} color={textSecondary} />
                    <Text style={styles.detailText}>Kerja: {todayRecord.workHours} jam</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar" size={48} color={textSecondary} />
              <Text style={styles.emptyText}>Belum ada riwayat absensi</Text>
            </View>
          )
        )}
      </View>
    </ScrollView>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}