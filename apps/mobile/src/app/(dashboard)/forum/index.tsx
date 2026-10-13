'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { forumApi, ForumThread } from '@/lib/api';
import styles from './ForumScreen.style';

/** IC-06 — Feed forum di mobile: filter tipe + daftar thread terbaru. */

const FILTERS: Array<{ label: string; value?: string }> = [
  { label: 'Semua' },
  { label: 'Pengumuman', value: 'ANNOUNCEMENT' },
  { label: 'Diskusi', value: 'DISCUSSION' },
  { label: 'Polling', value: 'POLL' },
  { label: 'Acara', value: 'EVENT' },
];

const typeLabels: Record<string, string> = {
  ANNOUNCEMENT: 'Pengumuman',
  DISCUSSION: 'Diskusi',
  POLL: 'Polling',
  EVENT: 'Acara',
};

export default function ForumFeedScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (type?: string) => {
    try {
      setError(null);
      const res = await forumApi.getThreads({ type, page: 1, limit: 50 });
      setThreads(res?.items ?? []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat forum');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(filter);
  }, [filter, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(filter);
  }, [filter, load]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderThread = ({ item }: { item: ForumThread }) => (
    <TouchableOpacity
      style={[styles.card, item.isPinned && styles.cardPinned]}
      activeOpacity={0.7}
      onPress={() => router.push(`/(dashboard)/forum/${item.id}`)}
    >
      <View style={styles.cardTop}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabels[item.type] ?? item.type}</Text>
        </View>
        {item.isPinned && (
          <View style={styles.pinBadge}>
            <Text style={styles.pinBadgeText}>Disematkan</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.cardSnippet} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{item.author?.fullName ?? '—'}</Text>
        <Text style={styles.metaText}>
          {item._count?.comments ?? item.comments?.length ?? 0} komentar · {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forum</Text>
        <Text style={styles.headerSubtitle}>Diskusi, pengumuman & polling karyawan</Text>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.value)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.centerText}>Memuat forum…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.filterChip} onPress={() => void load(filter)}>
            <Text style={styles.filterText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={renderThread}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={40} color="#94a3b8" />
              <Text style={styles.centerText}>Belum ada thread pada filter ini.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
