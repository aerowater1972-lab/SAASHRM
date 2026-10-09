'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { employeeApi } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import styles from './ProfileScreen.style';
import { Employee } from '@/types/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, setEmployee, hasPermission, loadStoredAuth } = useAuthStore();
  const [employee, setEmployeeState] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await employeeApi.getProfile();
      if (profile.employee) {
        setEmployee(profile.employee);
        setEmployeeState(profile.employee);
        setFormData({
          phone: profile.employee.phone || '',
          address: profile.employee.address || '',
          city: profile.employee.city || '',
          province: profile.employee.province || '',
          postalCode: profile.employee.postalCode || '',
          emergencyContactName: profile.employee.emergencyContactName || '',
          emergencyContactPhone: profile.employee.emergencyContactPhone || '',
          emergencyContactRelation: profile.employee.emergencyContactRelation || '',
          bankName: profile.employee.bankName || '',
          bankAccountNumber: profile.employee.bankAccountNumber || '',
          bankAccountName: profile.employee.bankAccountName || '',
        });
        if (profile.employee.avatar) {
          setAvatarUri(profile.employee.avatar);
        }
      } else {
        updateUser(profile);
        setFormData({
          phone: '',
          address: '',
          city: '',
          province: '',
          postalCode: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: '',
          bankName: '',
          bankAccountNumber: '',
          bankAccountName: '',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat profil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUser, setEmployee]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await employeeApi.updateProfile(formData);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
      setEditMode(false);
      loadProfile();
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Izinkan akses galeri untuk memilih foto');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setUploadingAvatar(true);
      try {
        await employeeApi.uploadAvatar({
          uri: result.assets[0].uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
        Alert.alert('Berhasil', 'Foto profil berhasil diperbarui');
        loadProfile();
      } catch {
        Alert.alert('Gagal', 'Gagal mengunggah foto');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleChangePassword = () => {
    router.push('/(dashboard)/settings/change-password');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadProfile} colors={[styles.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: styles.primary }]}>
              <Text style={styles.avatarInitials}>{getInitials(user?.fullName || 'User')}</Text>
            </View>
          )}
          {editMode && (
            <TouchableOpacity style={styles.avatarEditButton} onPress={pickAvatar} disabled={uploadingAvatar}>
              <Ionicons name={uploadingAvatar ? 'cloud-upload' : 'camera'} size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.name}>{user?.fullName || 'User'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {employee?.employeeNumber || user?.employeeId ? 'Karyawan' : 'Admin'}
            </Text>
          </View>
          {employee?.organization && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{employee.organization.name}</Text>
            </View>
          )}
          {employee?.department && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{employee.department.name}</Text>
            </View>
          )}
          {employee?.position && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{employee.position.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Info */}
      <View style={styles.quickInfo}>
        {employee?.hireDate && (
          <TouchableOpacity style={styles.quickItem} activeOpacity={0.8}>
            <Ionicons name="calendar" size={20} color={styles.primary} />
            <View>
              <Text style={styles.quickLabel}>Tanggal Bergabung</Text>
              <Text style={styles.quickValue}>{formatDate(employee.hireDate)}</Text>
            </View>
          </TouchableOpacity>
        )}
        {employee?.status && (
          <TouchableOpacity style={styles.quickItem} activeOpacity={0.8}>
            <Ionicons name="badge" size={20} color={styles.success} />
            <View>
              <Text style={styles.quickLabel}>Status</Text>
              <Text style={styles.quickValue}>{employee.status}</Text>
            </View>
          </TouchableOpacity>
        )}
        {employee?.employment?.[0]?.contractType && (
          <TouchableOpacity style={styles.quickItem} activeOpacity={0.8}>
            <Ionicons name="document-text" size={20} color={styles.warning} />
            <View>
              <Text style={styles.quickLabel}>Jenis Kontrak</Text>
              <Text style={styles.quickValue}>{employee.employment[0].contractType}</Text>
            </View>
          </TouchableOpacity>
        )}
        {employee?.employment?.[0]?.salary && (
          <TouchableOpacity style={styles.quickItem} activeOpacity={0.8}>
            <Ionicons name="cash" size={20} color={styles.danger} />
            <View>
              <Text style={styles.quickLabel}>Gaji Pokok</Text>
              <Text style={styles.quickValue}>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(employee.employment[0].salary)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Sections */}
      {editMode ? (
        <View style={styles.editForm}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nomor Telepon</Text>
              <TextInput
                style={styles.input}
                placeholder="08xx-xxxx-xxxx"
                value={formData.phone}
                onChangeText={(v) => setFormData({ ...formData, phone: v })}
                keyboardType="phone-pad"
                editable={editMode}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Alamat Lengkap</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Jalan, RT/RW, Kelurahan"
                value={formData.address}
                onChangeText={(v) => setFormData({ ...formData, address: v })}
                multiline
                numberOfLines={3}
                editable={editMode}
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kota</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(v) => setFormData({ ...formData, city: v })}
                  editable={editMode}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Provinsi</Text>
                <TextInput
                  style={styles.input}
                  value={formData.province}
                  onChangeText={(v) => setFormData({ ...formData, province: v })}
                  editable={editMode}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Kode Pos</Text>
              <TextInput
                style={styles.input}
                placeholder="12345"
                value={formData.postalCode}
                onChangeText={(v) => setFormData({ ...formData, postalCode: v })}
                keyboardType="numeric"
                editable={editMode}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kontak Darurat</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nama</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyContactName}
                onChangeText={(v) => setFormData({ ...formData, emergencyContactName: v })}
                editable={editMode}
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telepon</Text>
                <TextInput
                  style={styles.input}
                  value={formData.emergencyContactPhone}
                  onChangeText={(v) => setFormData({ ...formData, emergencyContactPhone: v })}
                  keyboardType="phone-pad"
                  editable={editMode}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hubungan</Text>
                <TextInput
                  style={styles.input}
                  value={formData.emergencyContactRelation}
                  onChangeText={(v) => setFormData({ ...formData, emergencyContactRelation: v })}
                  editable={editMode}
                />
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Informasi Rekening Bank</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nama Bank</Text>
              <TextInput
                style={styles.input}
                value={formData.bankName}
                onChangeText={(v) => setFormData({ ...formData, bankName: v })}
                editable={editMode}
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nomor Rekening</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bankAccountNumber}
                  onChangeText={(v) => setFormData({ ...formData, bankAccountNumber: v })}
                  keyboardType="numeric"
                  editable={editMode}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Atas Nama</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bankAccountName}
                  onChangeText={(v) => setFormData({ ...formData, bankAccountName: v })}
                  editable={editMode}
                />
              </View>
            </View>
          </View>

          <View style={styles.saveButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditMode(false); loadProfile(); }}>
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonLoading]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
              <TouchableOpacity onPress={() => setEditMode(true)}>
                <Ionicons name="create" size={20} color={styles.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Telepon</Text>
                <Text style={styles.infoValue}>{employee?.phone || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Alamat</Text>
                <Text style={styles.infoValue}>{employee?.address || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Kota</Text>
                <Text style={styles.infoValue}>{employee?.city || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Provinsi</Text>
                <Text style={styles.infoValue}>{employee?.province || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Kode Pos</Text>
                <Text style={styles.infoValue}>{employee?.postalCode || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>KTP</Text>
                <Text style={styles.infoValue}>{employee?.ktpNumber || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>NPWP</Text>
                <Text style={styles.infoValue}>{employee?.npwpNumber || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>BPJS Kesehatan</Text>
                <Text style={styles.infoValue}>{employee?.bpjsKesehatanNumber || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>BPJS Ketenagakerjaan</Text>
                <Text style={styles.infoValue}>{employee?.bpjsKetenagakerjaanNumber || '-'}</Text>
              </View>
            </View>
          </View>

          {employee?.emergencyContactName && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Kontak Darurat</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Nama</Text>
                  <Text style={styles.infoValue}>{employee.emergencyContactName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Telepon</Text>
                  <Text style={styles.infoValue}>{employee.emergencyContactPhone || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Hubungan</Text>
                  <Text style={styles.infoValue}>{employee.emergencyContactRelation || '-'}</Text>
                </View>
              </View>
            </View>
          )}

          {employee?.bankName && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Rekening Bank</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Bank</Text>
                  <Text style={styles.infoValue}>{employee.bankName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Nomor Rekening</Text>
                  <Text style={styles.infoValue}>{employee.bankAccountNumber || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Atas Nama</Text>
                  <Text style={styles.infoValue}>{employee.bankAccountName || '-'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Documents */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dokumen Saya</Text>
              <TouchableOpacity onPress={() => router.push('/(dashboard)/profile/documents')}>
                <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.documentItem} activeOpacity={0.8}>
              <Ionicons name="id-card" size={24} color={styles.primary} />
              <View>
                <Text style={styles.documentTitle}>KTP</Text>
                <Text style={styles.documentSubtitle}>Lihat / Unggah</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.documentItem} activeOpacity={0.8}>
              <Ionicons name="document" size={24} color={styles.primary} />
              <View>
                <Text style={styles.documentTitle}>NPWP</Text>
                <Text style={styles.documentSubtitle}>Lihat / Unggah</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.documentItem} activeOpacity={0.8}>
              <Ionicons name="card" size={24} color={styles.primary} />
              <View>
                <Text style={styles.documentTitle}>BPJS Kesehatan</Text>
                <Text style={styles.documentSubtitle}>Lihat / Unggah</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.documentItem} activeOpacity={0.8}>
              <Ionicons name="briefcase" size={24} color={styles.primary} />
              <View>
                <Text style={styles.documentTitle}>Kontrak Kerja</Text>
                <Text style={styles.documentSubtitle}>Lihat / Unggah</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword} activeOpacity={0.8}>
              <Ionicons name="lock-closed" size={24} color={styles.primary} />
              <Text style={styles.actionButtonText}>Ubah Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => Alert.alert('Keluar', 'Yakin ingin keluar?', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Keluar', onPress: () => useAuthStore.getState().logout() },
              ])}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out" size={24} color={styles.danger} />
              <Text style={[styles.actionButtonText, { color: styles.danger }]}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}