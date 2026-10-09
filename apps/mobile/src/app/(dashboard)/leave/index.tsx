'use client';

import { useEffect, useCallback } from 'react';
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
import styles from './LeaveScreen.style';
import { LeaveType, LeaveBalance, LeaveRequest } from '@/types/api';

export default function LeaveScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    leaveTypes,
    leaveBalances,
    leaveRequests,
    fetchLeaveTypes,
    fetchLeaveBalances,
    fetchLeaveRequests,
    createLeaveRequest,
    cancelLeaveRequest,
    isLoading,
  } = useAttendanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchLeaveTypes(),
      fetchLeaveBalances(),
      fetchLeaveRequests(),
    ]);
    setRefreshing(false);
  }, [fetchLeaveTypes, fetchLeaveBalances, fetchLeaveRequests]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateLeave = async () => {
    if (!selectedLeaveType || !startDate || !endDate || !reason.trim()) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }

    setCreating(true);
    try {
      await createLeaveRequest({
        leaveTypeId: selectedLeaveType.id,
        startDate,
        endDate,
        reason: reason.trim(),
      });
      Alert.alert('Berhasil', 'Pengajuan cuti berhasil dikirim');
      setShowCreateModal(false);
      setSelectedLeaveType(null);
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Gagal mengajukan cuti');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[styles.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Leave Balances */}
      <View style={styles.balancesSection}>
        <Text style={styles.sectionTitle}>Saldo Cuti</Text>
        {leaveBalances.length > 0 ? (
          <View style={styles.balancesGrid}>
            {leaveBalances.map((balance) => {
              const leaveType = leaveTypes.find((lt) => lt.id === balance.leaveTypeId);
              const usedPercent = balance.totalDays > 0 ? (balance.usedDays / balance.totalDays) * 100 : 0;
              return (
                <View key={balance.id} style={styles.balanceCard}>
                  <View style={styles.balanceHeader}>
                    <View style={[styles.balanceColor, { backgroundColor: leaveType?.color || styles.primary }]} />
                    <Text style={styles.balanceType}>{leaveType?.name || 'Cuti'}</Text>
                  </View>
                  <View style={styles.balanceNumbers}>
                    <Text style={styles.balanceAvailable}>{balance.availableDays}</Text>
                    <Text style={styles.balanceLabel}>Tersedia</Text>
                  </View>
                  <View style={styles.balanceProgress}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${Math.min(usedPercent, 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.balanceDetail}>
                    <Text style={styles.balanceUsed}>
                      {balance.usedDays} dari {balance.totalDays} hari digunakan
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBalances}>
            <Ionicons name="information-circle" size={48} color={styles.textSecondary} />
            <Text style={styles.emptyText}>Belum ada data saldo cuti</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          testID="leave-create-button"
          accessibilityLabel="Ajukan Cuti"
          style={styles.actionCard}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={28} color={styles.primary} />
          <Text style={styles.actionText}>Ajukan Cuti</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(dashboard)/leave/history')}
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
          <TouchableOpacity onPress={() => router.push('/(dashboard)/leave/history')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        {leaveRequests.length > 0 ? (
          leaveRequests.slice(0, 5).map((request) => {
            const leaveType = leaveTypes.find((lt) => lt.id === request.leaveTypeId);
            return (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => router.push(`/leave/detail/${request.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.requestLeft}>
                  <View style={[styles.requestTypeIcon, { backgroundColor: leaveType?.color || styles.primary }]}>
                    <Ionicons name="calendar" size={20} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.requestType}>{leaveType?.name || 'Cuti'}</Text>
                    <Text style={styles.requestDate}>
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
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
            );
          })
        ) : (
          <View style={styles.emptyRequests}>
            <Ionicons name="document-text" size={48} color={styles.textSecondary} />
            <Text style={styles.emptyText}>Belum ada pengajuan cuti</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.emptyActionText}>Ajukan Cuti Pertama</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Create Leave Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajukan Cuti</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={styles.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Jenis Cuti *</Text>
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    selectedLeaveType && styles.selectButtonSelected,
                  ]}
                  onPress={() => {}}
                >
                  <Text style={styles.selectText}>
                    {selectedLeaveType?.name || 'Pilih jenis cuti'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={styles.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tanggal Mulai *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {}}
                  >
                    <Text style={styles.dateButtonText}>
                      {startDate ? formatDate(startDate) : 'Pilih tanggal'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tanggal Selesai *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {}}
                  >
                    <Text style={styles.dateButtonText}>
                      {endDate ? formatDate(endDate) : 'Pilih tanggal'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Alasan *</Text>
                <Text
                  style={styles.textArea}
                  placeholder="Jelaskan alasan cuti..."
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
                onPress={handleCreateLeave}
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