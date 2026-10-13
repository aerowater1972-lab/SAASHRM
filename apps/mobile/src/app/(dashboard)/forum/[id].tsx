'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { forumApi, ForumComment, ForumThread } from '@/lib/api';
import styles from './ForumScreen.style';

/** IC-06 — Detail thread forum mobile: reaksi, polling, komentar & balasan. */

const REACTIONS: Array<{ type: string; emoji: string; label: string }> = [
  { type: 'LIKE', emoji: '\u{1F44D}', label: 'Suka' },
  { type: 'LOVE', emoji: '❤️', label: 'Cinta' },
  { type: 'CELEBRATE', emoji: '\u{1F389}', label: 'Rayakan' },
  { type: 'INSIGHTFUL', emoji: '\u{1F4A1}', label: 'Insight' },
  { type: 'CURIOUS', emoji: '\u{1F914}', label: 'Penasaran' },
];

const typeLabels: Record<string, string> = {
  ANNOUNCEMENT: 'Pengumuman',
  DISCUSSION: 'Diskusi',
  POLL: 'Polling',
  EVENT: 'Acara',
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function ForumThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [thread, setThread] = useState<ForumThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<ForumComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyReaction, setBusyReaction] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await forumApi.getThread(id);
      setThread(res);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat thread');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const myReaction = thread?.reactions?.find((r) => r.user?.id === user?.id)?.reactionType;
  const reactionCount = (type: string) =>
    thread?.reactions?.filter((r) => r.reactionType === type).length ?? 0;

  const onReact = async (type: string) => {
    if (!id || thread?.isLocked) return;
    setBusyReaction(type);
    try {
      await forumApi.reactThread(id, type);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Gagal mengirim reaksi');
    } finally {
      setBusyReaction(null);
    }
  };

  const onVote = async (index: number) => {
    if (!id || thread?.isLocked) return;
    try {
      await forumApi.votePoll(id, index);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Gagal voting');
    }
  };

  const onSubmitComment = async () => {
    const content = comment.trim();
    if (!id || !content || submitting) return;
    setSubmitting(true);
    try {
      await forumApi.addComment(id, { content, parentCommentId: replyTo?.id });
      setComment('');
      setReplyTo(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Gagal mengirim komentar');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (c: ForumComment, isReply = false) => (
    <View key={c.id} style={[styles.commentCard, isReply && styles.commentReply]}>
      <View style={styles.cardTop}>
        <Text style={styles.commentAuthor}>{c.author?.fullName ?? 'Pengguna'}</Text>
        <Text style={styles.commentDate}>{formatDate(c.createdAt)}</Text>
      </View>
      <Text style={styles.commentText}>{c.content}</Text>
      {!isReply && !thread?.isLocked && (
        <TouchableOpacity style={styles.replyBtn} onPress={() => setReplyTo(c)}>
          <Text style={styles.replyBtnText}>Balas</Text>
        </TouchableOpacity>
      )}
      {!isReply && c.replies?.map((r) => renderComment(r, true))}
    </View>
  );
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.centerText}>Memuat thread…</Text>
      </View>
    );
  }

  if (error && !thread) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.filterChip} onPress={() => void load()}>
          <Text style={styles.filterText}>Coba lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {thread?.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.detailBody}>
        <View style={styles.cardTop}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabels[thread?.type ?? ''] ?? thread?.type}</Text>
          </View>
          {thread?.isLocked && (
            <View style={styles.pinBadge}>
              <Text style={styles.pinBadgeText}>Dikunci</Text>
            </View>
          )}
        </View>
        <Text style={styles.detailMeta}>
          {thread?.author?.fullName ?? '—'}
          {thread?.department ? ` · ${thread.department.name}` : ''} · {formatDate(thread?.createdAt)}
        </Text>
        <Text style={styles.detailContent}>{thread?.content}</Text>

        {/* Reaksi */}
        <View style={styles.reactionRow}>
          {REACTIONS.map((r) => {
            const active = myReaction === r.type;
            const count = reactionCount(r.type);
            return (
              <TouchableOpacity
                key={r.type}
                style={[styles.reactionBtn, active && styles.reactionBtnActive]}
                onPress={() => void onReact(r.type)}
                disabled={busyReaction === r.type || thread?.isLocked}
              >
                <Text style={styles.reactionText}>
                  {r.emoji} {count > 0 ? count : r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Polling */}
        {thread?.type === 'POLL' && (
          <View>
            <Text style={styles.sectionTitle}>Polling</Text>
            {(thread.pollOptions ?? []).map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.pollOption}
                onPress={() => void onVote(idx)}
                disabled={thread.isLocked}
              >
                <Text style={styles.pollLabel}>{opt.text}</Text>
                <Text style={styles.pollVotes}>{opt.votes ?? 0} suara</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Komentar */}
        <Text style={styles.sectionTitle}>
          Komentar ({thread?._count?.comments ?? thread?.comments?.length ?? 0})
        </Text>
        {(thread?.comments ?? []).map((c) => renderComment(c))}
      </ScrollView>

      {/* Input komentar */}
      {!thread?.isLocked && (
        <View>
          {replyTo && (
            <View style={styles.cardTop}>
              <Text style={styles.metaText}>Membalas {replyTo.author?.fullName ?? 'komentar'}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={replyTo ? 'Tulis balasan…' : 'Tulis komentar…'}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, submitting && { opacity: 0.6 }]}
              onPress={() => void onSubmitComment()}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>Kirim</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

