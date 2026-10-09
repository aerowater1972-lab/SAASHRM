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
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { attendanceApi } from '@/lib/api';
import { colors } from '@/lib/theme';

type LeaveItem = {
  id: string;
  employeeId: string;
  employee?: { fullName?: string };
  leaveType?: { name?: string };
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
};

type OvertimeItem = {
  id: string;
  employeeId: string;
  employee?: { fullName?: string };
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

function formatDate(s?: string) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export default function AdminInboxScreen() {
  const { hasAnyPermission } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [overtimes, setOvertimes] = useState<OvertimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectKind, setRejectKind] = useState<'leave' | 'overtime' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const canApprove = hasAnyPermission(['leave-requests:approve', 'overtime:approve', 'admin:user:read']);

  const load = useCallback(async () => {
    try {
      const [lv, ov] = await Promise.all([
        attendanceApi.getPendingLeaveApprovals().catch(() => [] as any),
        attendanceApi.getOvertimeRequests({ status: 'PENDING' }).catch(() => ({ data: [] })),
      ]);
      setLeaves(Array.isArray(lv) ? lv : (lv as any)?.data ?? []);
      setOvertimes((ov as any)?.data ?? []);
    } catch {
      // offline: keep previous state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (canApprove) load();
    else setLoading(false);
  }, [canApprove, load]);

  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e: any) {
      Alert.alert('Gagal', e?.response?.data?.message || e?.message || 'Operasi gagal');
    } finally {
      setBusyId(null);
      setRejectId(null);
      setRejectReason('');
    }
  };

  if (!canApprove) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Anda tidak memiliki akses admin.</Text>
      </View>
    );
  }

  const renderRejectRow = (id: string, kind: 'leave' | 'overtime') => {
    if (rejectId !== id) return null;
    return (
      <View style={styles.rejectRow}>
        <TextInput
          testID="reject-reason-input"
          style={styles.rejectInput}
          placeholder="Alasan penolakan…"
          value={rejectReason}
          onChangeText={setRejectReason}
        />
        <TouchableOpacity
          testID="reject-confirm-button"
          style={[styles.smallButton, styles.rejectButton]}
          disabled={busyId === id || !rejectReason.trim()}
          onPress={() =>
            act(
              () =>
                kind === 'leave'
                  ? attendanceApi.rejectLeaveRequest(id, rejectReason.trim())
                  : attendanceApi.rejectOvertimeRequest(id, rejectReason.trim()),
              id,
            )
          }
        >
          {busyId === id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.smallButtonText}>Kirim</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      testID="admin-inbox"
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
    >
      <Text style={styles.header}>Kotak Persetujuan</Text>

      <Text style={styles.sectionTitle}>Cuti menunggu ({leaves.length})</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : leaves.length === 0 ? (
        <Text style={styles.emptyText}>Tidak ada pengajuan cuti menunggu.</Text>
      ) : (
        leaves.map((l) => (
          <View key={l.id} style={styles.card}>
            <Text style={styles.cardTitle}>{l.employee?.fullName ?? l.employeeId}</Text>
            <Text style={styles.cardSub}>
              {(l.leaveType as any)?.name ?? ''} • {formatDate(l.startDate)} – {formatDate(l.endDate)} ({l.totalDays} hari)
            </Text>
            <Text style={styles.reason}>{l.reason}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                testID={`approve-leave-${l.id}`}
                style={[styles.smallButton, styles.approveButton]}
                disabled={busyId === l.id}
                onPress={() =>
                  Alert.alert('Setujui cuti?', `${l.employee?.fullName ?? ''} • ${l.totalDays} hari`, [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Setujui', onPress: () => act(() => attendanceApi.approveLeaveRequest(l.id), l.id) },
                  ])
                }
              >
                <Text style={styles.smallButtonText}>Setujui</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={`reject-leave-${l.id}`}
                style={[styles.smallButton, styles.rejectButton]}
                onPress={() => { setRejectId(l.id); setRejectKind('leave'); setRejectReason(''); }}
              >
                <Text style={styles.smallButtonText}>Tolak</Text>
              </TouchableOpacity>
            </View>
            {rejectKind === 'leave' && renderRejectRow(l.id, 'leave')}
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Lembur menunggu ({overtimes.length})</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : overtimes.length === 0 ? (
        <Text style={styles.emptyText}>Tidak ada pengajuan lembur menunggu.</Text>
      ) : (
        overtimes.map((o) => (
          <View key={o.id} style={styles.card}>
            <Text style={styles.cardTitle}>{o.employee?.fullName ?? o.employeeId}</Text>
            <Text style={styles.cardSub}>
              {formatDate(o.date)} • {String(o.startTime).slice(0, 5)}–{String(o.endTime).slice(0, 5)}
            </Text>
            <Text style={styles.reason}>{o.reason}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                testID={`approve-overtime-${o.id}`}
                style={[styles.smallButton, styles.approveButton]}
                disabled={busyId === o.id}
                onPress={() =>
                  Alert.alert('Setujui lembur?', `${o.employee?.fullName ?? ''} • ${formatDate(o.date)}`, [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Setujui', onPress: () => act(() => attendanceApi.approveOvertimeRequest(o.id), o.id) },
                  ])
                }
              >
                <Text style={styles.smallButtonText}>Setujui</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={`reject-overtime-${o.id}`}
                style={[styles.smallButton, styles.rejectButton]}
                onPress={() => { setRejectId(o.id); setRejectKind('overtime'); setRejectReason(''); }}
              >
                <Text style={styles.smallButtonText}>Tolak</Text>
              </TouchableOpacity>
            </View>
            {rejectKind === 'overtime' && renderRejectRow(o.id, 'overtime')}
          </View>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  header: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 8 },
  loader: { marginVertical: 16 },
  emptyText: { fontSize: 13, color: colors.textSecondary, marginVertical: 8 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reason: { fontSize: 13, color: colors.text, marginTop: 6, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approveButton: { backgroundColor: colors.success },
  rejectButton: { backgroundColor: colors.danger },
  smallButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rejectRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rejectInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text, backgroundColor: colors.background },
});
