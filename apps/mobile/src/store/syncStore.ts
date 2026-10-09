import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SyncQueueItem } from '@/types/api';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/api';
import { useAuthStore } from './authStore';

interface SyncState {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;

  // Actions
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt'>) => string;
  processQueue: () => Promise<void>;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  retryFailed: () => void;
}

const secureStorage = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      lastSyncAt: null,
      pendingCount: 0,

      addToQueue: (item) => {
        const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newItem: SyncQueueItem = {
          ...item,
          id,
          status: 'PENDING',
          retryCount: 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          queue: [...state.queue, newItem],
          pendingCount: state.pendingCount + 1,
        }));

        // Trigger sync if online
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          get().processQueue();
        }

        return id;
      },

      processQueue: async () => {
        const { queue, isSyncing } = get();
        if (isSyncing || queue.length === 0) return;

        const pendingItems = queue.filter((item) => item.status === 'PENDING' || item.status === 'FAILED');
        if (pendingItems.length === 0) return;

        set({ isSyncing: true });

        for (const item of pendingItems) {
          set((state) => ({
            queue: state.queue.map((i) =>
              i.id === item.id ? { ...i, status: 'SYNCING' as const } : i
            ),
          }));

          try {
            // Process based on type
            switch (item.type) {
              case 'ATTENDANCE_CHECKIN':
                await api.post('/attendance/check-in', item.payload);
                break;
              case 'ATTENDANCE_CHECKOUT':
                await api.post('/attendance/check-out', item.payload);
                break;
              case 'LEAVE_REQUEST':
                await api.post('/attendance/leave-requests', item.payload);
                break;
              case 'OVERTIME_REQUEST':
                await api.post('/attendance/overtime-requests', item.payload);
                break;
              case 'EXPENSE_CLAIM':
                await api.post('/expense-claims', item.payload);
                break;
              case 'PROFILE_UPDATE':
                await api.patch('/employees/me', item.payload);
                break;
            }

            set((state) => ({
              queue: state.queue.map((i) =>
                i.id === item.id ? { ...i, status: 'SYNCED' as const, syncedAt: new Date().toISOString() } : i
              ),
              pendingCount: Math.max(0, state.pendingCount - 1),
            }));
          } catch (error: any) {
            const newRetryCount = item.retryCount + 1;
            const newStatus = newRetryCount >= 3 ? 'FAILED' : 'PENDING';

            set((state) => ({
              queue: state.queue.map((i) =>
                i.id === item.id
                  ? { ...i, status: newStatus, retryCount: newRetryCount, error: error.message }
                  : i
              ),
            }));
          }
        }

        set({ isSyncing: false, lastSyncAt: new Date().toISOString() });

        // Clean up synced items older than 24 hours
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        set((state) => ({
          queue: state.queue.filter(
            (i) => i.status !== 'SYNCED' || new Date(i.syncedAt || 0).getTime() > dayAgo
          ),
        }));
      },

      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((i) => i.id !== id),
          pendingCount: Math.max(0, state.pendingCount - 1),
        }));
      },

      clearQueue: () => {
        set({ queue: [], pendingCount: 0 });
      },

      retryFailed: () => {
        set((state) => ({
          queue: state.queue.map((i) =>
            i.status === 'FAILED' ? { ...i, status: 'PENDING' as const, retryCount: 0, error: undefined } : i
          ),
        }));
        get().processQueue();
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        queue: state.queue,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().processQueue();
  });
}