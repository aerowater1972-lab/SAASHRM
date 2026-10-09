'use client';

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useBiometricStore } from '@/store/biometricStore';
import { useSyncStore } from '@/store/syncStore';
import styles from './SettingsScreen.style';
import FaceCapture from '@/components/biometric/FaceCapture';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, loadStoredAuth } = useAuthStore();
  const { isEnrolled, checkEnrollmentStatus, enrollFace, clearEnrollment, isLoading: bioLoading } = useBiometricStore();
  const { pendingCount, processQueue, lastSyncAt } = useSyncStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [showFaceEnroll, setShowFaceEnroll] = useState(false);
  const [showFaceVerify, setShowFaceVerify] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  useEffect(() => {
    checkEnrollmentStatus();
    setBiometricEnabled(isEnrolled);
  }, [checkEnrollmentStatus, isEnrolled]);

  const handleFaceEnroll = async (embedding: number[], quality: number) => {
    try {
      await enrollFace(embedding, quality);
      setBiometricEnabled(true);
      setShowFaceEnroll(false);
      Alert.alert('Berhasil', `Wajah berhasil didaftarkan (Kualitas: ${Math.round(quality * 100)}%)`);
    } catch (error: any) {
      setEnrollmentError(error.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleFaceVerify = async (embedding: number[], quality: number) => {
    // Used for testing verification
    Alert.alert('Verifikasi', `Kualitas deteksi: ${Math.round(quality * 100)}%`);
  };

  const handleRemoveBiometric = async () => {
    Alert.alert(
      'Hapus Data Wajah',
      'Yakin ingin menghapus data wajah? Anda perlu mendaftarkan ulang untuk absensi wajah.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await clearEnrollment();
            setBiometricEnabled(false);
            Alert.alert('Berhasil', 'Data wajah telah dihapus');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSync = async () => {
    await processQueue();
    Alert.alert('Sinkronisasi', 'Data offline telah disinkronkan');
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Belum pernah';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Account Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Akun</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{user?.email || '-'}</Text>
          </View>
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Nama</Text>
            <Text style={styles.settingValue}>{user?.fullName || '-'}</Text>
          </View>
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Tenant</Text>
            <Text style={styles.settingValue}>{user?.tenantId || 'default'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout} activeOpacity={0.8}>
          <View style={styles.settingInfo}>
            <Ionicons name="log-out" size={22} color={styles.danger} style={{ marginRight: 12 }} />
            <Text style={[styles.settingLabel, { color: styles.danger }]}>Keluar</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Biometric Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Verifikasi Wajah</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="scan-face" size={24} color={styles.primary} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Absensi Wajah</Text>
              <Text style={styles.settingSubtitle}>
                {isEnrolled ? 'Wajah terdaftar' : 'Belum terdaftar'}
              </Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={(value) => {
              if (value && !isEnrolled) {
                setShowFaceEnroll(true);
              } else if (!value && isEnrolled) {
                handleRemoveBiometric();
              }
              setBiometricEnabled(value);
            }}
            disabled={bioLoading || enrolling}
            thumbColor={biometricEnabled ? styles.primary : '#fff'}
            trackColor={{ false: '#e2e8f0', true: styles.primaryLight }}
          />
        </View>
        {isEnrolled && (
          <TouchableOpacity style={styles.settingItem} onPress={handleRemoveBiometric} activeOpacity={0.8}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash" size={22} color={styles.danger} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.settingLabel}>Hapus Data Wajah</Text>
                <Text style={styles.settingSubtitle}>Hapus data wajah yang tersimpan</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notifikasi</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="notifications" size={24} color={styles.primary} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>Terima notifikasi cuti, lembur, slip gaji, dll</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor={notificationsEnabled ? styles.primary : '#fff'}
            trackColor={{ false: '#e2e8f0', true: styles.primaryLight }}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="bell" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Pengaturan Notifikasi</Text>
              <Text style={styles.settingSubtitle}>Atur jenis notifikasi yang diterima</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
        </View>
      </View>

      {/* Data & Sync Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Data & Sinkronisasi</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="sync" size={24} color={styles.primary} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Sinkron Otomatis</Text>
              <Text style={styles.settingSubtitle}>Sinkronkan data saat online otomatis</Text>
            </View>
          </View>
          <Switch
            value={autoSyncEnabled}
            onValueChange={setAutoSyncEnabled}
            thumbColor={autoSyncEnabled ? styles.primary : '#fff'}
            trackColor={{ false: '#e2e8f0', true: styles.primaryLight }}
          />
        </View>
        <TouchableOpacity style={styles.settingItem} onPress={handleSync} activeOpacity={0.8} disabled={pendingCount === 0}>
          <View style={styles.settingInfo}>
            <Ionicons name="cloud-upload" size={22} color={pendingCount > 0 ? styles.primary : styles.textSecondary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Sinkronkan Sekarang</Text>
              <Text style={styles.settingSubtitle}>
                {pendingCount > 0 ? `${pendingCount} item menunggu` : 'Tidak ada data pending'}
              </Text>
            </View>
          </View>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="time" size={22} color={styles.textSecondary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Sinkron Terakhir</Text>
              <Text style={styles.settingSubtitle}>{formatLastSync(lastSyncAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="trash" size={22} color={styles.danger} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Bersihkan Cache</Text>
              <Text style={styles.settingSubtitle}>Hapus data cache dan file sementara</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Keamanan</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="lock-closed" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Ubah Password</Text>
              <Text style={styles.settingSubtitle}>Perbarui kata sandi akun Anda</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="fingerprint" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Kunci Aplikasi</Text>
              <Text style={styles.settingSubtitle}>Gunakan Face ID / Fingerprint untuk membuka aplikasi</Text>
            </View>
          </View>
          <Switch
            value={false}
            onValueChange={() => Alert.alert('Fitur', 'Kunci aplikasi dengan biometrik akan segera hadir')}
            thumbColor={styles.primary}
            trackColor={{ false: '#e2e8f0', true: styles.primaryLight }}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="shield" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Verifikasi 2FA</Text>
              <Text style={styles.settingSubtitle}>Aktifkan autentikasi dua faktor</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Aplikasi</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="information-circle" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Versi Aplikasi</Text>
              <Text style={styles.settingSubtitle}>1.0.0 (Build 1)</Text>
            </View>
          </View>
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="document-text" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Syarat & Ketentuan</Text>
              <Text style={styles.settingSubtitle}>Baca syarat dan ketentuan penggunaan</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="shield-checkmark" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Kebijakan Privasi</Text>
              <Text style={styles.settingSubtitle}>Pelindungan data pribadi Anda</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="help-circle" size={22} color={styles.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.settingLabel}>Bantuan & Dukungan</Text>
              <Text style={styles.settingSubtitle}>Hubungi tim dukungan kami</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
        </View>
      </View>

      {/* Face Enroll Modal */}
      <Modal visible={showFaceEnroll} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <FaceCapture
            onCapture={handleFaceEnroll}
            onCancel={() => { setShowFaceEnroll(false); setEnrolling(false); }}
            title="Daftarkan Wajah"
            subtitle="Arahkan wajah ke dalam frame untuk mendaftarkan biometrik"
          />
        </View>
      </Modal>

      {/* Face Verify Modal */}
      <Modal visible={showFaceVerify} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <FaceCapture
            onCapture={handleFaceVerify}
            onCancel={() => setShowFaceVerify(false)}
            title="Test Verifikasi"
            subtitle="Test apakah wajah Anda dikenali sistem"
          />
        </View>
      </Modal>
    </ScrollView>
  );
}