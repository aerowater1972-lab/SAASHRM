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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useAttendanceStore } from '@/store/attendanceStore';
import styles from './OvertimeScreen.style';
import { OvertimeRequest } from '@/types/api';

export default function OvertimeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    overtimeRequests,
    fetchOvertimeRequests,
    createOvertimeRequest,
    isLoading,
  } = useAttendanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    await fetchOvertimeRequests();
    setRefreshing(false);
  }, [fetchOvertimeRequests]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateOvertime = async () => {
    if (!selectedDate || !startTime || !endTime || !reason.trim()) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }

    setCreating(true);
    try {
      await createOvertimeRequest({
        date: selectedDate,
        startTime,
        endTime,
        reason: reason.trim(),
      });
      Alert.alert('Berhasil', 'Pengajuan lembur berhasil dikirim');
      setShowCreateModal(false);
      setSelectedDate('');
      setStartTime('');
      setEndTime('');
      setReason('');
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Gagal mengajukan lembur');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return styles.statusApproved;
      case 'REJECTED':
        return styles.statusRejected;
      case 'CANCELLED':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  const calculateHours = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diff = endMins - startMins;
    if (diff <= 0) return '0 jam';
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[styles.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Stats */}
      <View style={styles.summarySection}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}><Ionicons name="time" size={24} color={styles.primary} /></View>
          <View>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Jam Lembur Bulan Ini</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIcon}><Ionicons name="cash" size={24} color={styles.success} /></View>
          <View>
            <Text style={styles.statValue}>Rp 1.200.000</Text>
            <Text style={styles.statLabel}>Estimasi Honorarium</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIcon}><Ionicons name="checkmark-circle" size={24} color={styles.warning} /></View>
          <View>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Menunggu Persetujuan</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={28} color={styles.primary} />
          <Text style={styles.actionText}>Ajukan Lembur</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(dashboard)/overtime/history')}
          activeOpacity={0.8}
        >
          <Ionicons name="list" size={28} color={styles.primary} />
          <Text style={styles.actionText}>Riwayat Lengkap</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Requests */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pengajuan Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard)/overtime/history')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        {overtimeRequests.length > 0 ? (
          overtimeRequests.slice(0, 5).map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => router.push(`/overtime/detail/${request.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.requestLeft}>
                <View style={styles.requestTypeIcon}>
                  <Ionicons name="time" size={20} color={styles.primary} />
                </View>
                <View>
                  <Text style={styles.requestType}>{formatDate(request.date)}</Text>
                  <Text style={styles.requestTime}>
                    {formatTime(request.startTime)} - {formatTime(request.endTime)}
                    ({calculateHours(request.startTime, request.endTime)})
                  </Text>
                </View>
              </View>
              <View style={styles.requestRight}>
                <View style={[styles.statusBadge, getStatusStyle(request.status)]}>
                  <Text style={styles.statusText}>
                    {request.status === 'PENDING' ? 'Menunggu' :
                     request.status === 'APPROVED' ? 'Disetujui' :
                     request.status === 'REJECTED' ? 'Ditolak' : 'Dibatalkan'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={styles.textSecondary} />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyRequests}>
            <Ionicons name="time" size={48} color={styles.textSecondary} />
            <Text style={styles.emptyText}>Belum ada pengajuan lembur</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.emptyActionText}>Ajukan Lembur Pertama</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Create Overtime Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajukan Lembur</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={styles.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tanggal *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {}}
                >
                  <Text style={styles.dateButtonText}>
                    {selectedDate ? formatDate(selectedDate) : 'Pilih tanggal'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Jam Mulai *</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {}}
                  >
                    <Text style={styles.timeButtonText}>
                      {startTime ? formatTime(startTime) : 'Pilih jam'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Jam Selesai *</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {}}
                  >
                    <Text style={styles.timeButtonText}>
                      {endTime ? formatTime(endTime) : 'Pilih jam'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.hoursPreview}>
                <Text style={styles.hoursLabel}>Total Jam:</Text>
                <Text style={styles.hoursValue}>
                  {selectedDate && startTime && endTime ? calculateHours(startTime, endTime) : '0 jam'}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Alasan *</Text>
                <Text
                  style={styles.textArea}
                  placeholder="Jelaskan alasan lembur (mis: deadline project, meeting client, dll)..."
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonConfirm, creating && styles.modalButtonLoading]}
                onPress={handleCreateOvertime}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Kirim Pengajuan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}