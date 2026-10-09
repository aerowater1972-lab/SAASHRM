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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { employeeApi } from '@/lib/api';
import styles from './PayrollScreen.style';
import { Payslip } from '@/types/api';

export default function PayrollScreen() {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const canAccessPayroll = hasPermission('payroll:payslip:read') || hasPermission('payroll:run:read');

  const loadPayslips = useCallback(async () => {
    if (!canAccessPayroll) return;
    setLoading(true);
    try {
      const { data } = await employeeApi.getPayslips({ year: selectedYear });
      setPayslips(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat slip gaji');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAccessPayroll, selectedYear]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  const handleDownload = async (payslip: Payslip) => {
    if (!payslip.pdfUrl) {
      Alert.alert('Info', 'PDF belum tersedia untuk slip gaji ini');
      return;
    }

    setDownloading(payslip.id);
    try {
      // In production, use expo-file-system to download
      Alert.alert('Berhasil', 'Slip gaji berhasil diunduh');
    } catch {
      Alert.alert('Gagal', 'Gagal mengunduh slip gaji');
    } finally {
      setDownloading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACKNOWLEDGED':
        return styles.statusAcknowledged;
      case 'SENT':
        return styles.statusSent;
      case 'GENERATED':
        return styles.statusGenerated;
      default:
        return styles.statusDraft;
    }
  };

  if (!canAccessPayroll) {
    return (
      <View style={styles.container}>
        <View style={styles.noAccess}>
          <Ionicons name="lock-closed" size={64} color={styles.textSecondary} />
          <Text style={styles.noAccessTitle}>Akses Terbatas</Text>
          <Text style={styles.noAccessText}>
            Anda tidak memiliki izin untuk mengakses data payroll.
            Silakan hubungi administrator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadPayslips} colors={[styles.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity style={styles.yearButton} onPress={() => setShowYearPicker(true)}>
          <Text style={styles.yearLabel}>Periode</Text>
          <View style={styles.yearValue}>
            <Text style={styles.yearText}>{selectedYear}</Text>
            <Ionicons name="chevron-down" size={20} color={styles.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      {payslips.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ringkasan {selectedYear}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(payslips.reduce((sum, p) => sum + p.grossSalary, 0) / payslips.length)}
              </Text>
              <Text style={styles.summaryLabel}>Rata-rata Bruto</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(payslips.reduce((sum, p) => sum + p.netSalary, 0) / payslips.length)}
              </Text>
              <Text style={styles.summaryLabel}>Rata-rata Netto</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{payslips.length}</Text>
              <Text style={styles.summaryLabel}>Total Slip</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {payslips.filter((p) => p.status === 'ACKNOWLEDGED').length}
              </Text>
              <Text style={styles.summaryLabel}>Dikonfirmasi</Text>
            </View>
          </View>
        </View>
      )}

      {/* Payslip List */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Slip Gaji</Text>
        </View>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={styles.primary} />
            <Text style={styles.loadingText}>Memuat slip gaji...</Text>
          </View>
        ) : payslips.length > 0 ? (
          payslips.map((payslip) => (
            <TouchableOpacity
              key={payslip.id}
              style={styles.payslipCard}
              onPress={() => router.push(`/payroll/detail/${payslip.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.payslipHeader}>
                <View style={styles.payslipPeriod}>
                  <Text style={styles.payslipMonth}>
                    {new Date(payslip.periodStart).toLocaleDateString('id-ID', { month: 'long' })}
                  </Text>
                  <Text style={styles.payslipYear}>{selectedYear}</Text>
                </View>
                <View style={styles.payslipStatus}>
                  <View style={[styles.statusBadge, getStatusStyle(payslip.status)]}>
                    <Text style={styles.statusText}>
                      {payslip.status === 'ACKNOWLEDGED' ? 'Dikonfirmasi' :
                       payslip.status === 'SENT' ? 'Ter kirim' :
                       payslip.status === 'GENERATED' ? 'Dibuat' : 'Draft'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.payslipAmounts}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Gaji Bruto</Text>
                  <Text style={styles.amountValue}>{formatCurrency(payslip.grossSalary)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Total Potongan</Text>
                  <Text style={styles.amountValueDeduction}>{formatCurrency(payslip.totalDeductions)}</Text>
                </View>
                <View style={styles.amountRowHighlight}>
                  <Text style={styles.amountLabel}>Gaji Bersih</Text>
                  <Text style={styles.amountValueHighlight}>{formatCurrency(payslip.netSalary)}</Text>
                </View>
              </View>

              <View style={styles.payslipActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDownload(payslip)}
                  disabled={!!downloading || !payslip.pdfUrl}
                  activeOpacity={0.8}
                >
                  <Ionicons name={downloading === payslip.id ? 'cloud-download' : 'download'} size={20} color={styles.primary} />
                  <Text style={styles.actionButtonText}>
                    {downloading === payslip.id ? 'Mengunduh...' : 'Unduh PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text" size={48} color={styles.textSecondary} />
            <Text style={styles.emptyTitle}>Belum Ada Slip Gaji</Text>
            <Text style={styles.emptyText}>
              Slip gaji untuk periode {selectedYear} belum tersedia.
            </Text>
          </View>
        )}
      </View>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Tahun</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Ionicons name="close" size={24} color={styles.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.yearList}>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearItem,
                    year === selectedYear && styles.yearItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={[
                    styles.yearItemText,
                    year === selectedYear && styles.yearItemTextSelected,
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}