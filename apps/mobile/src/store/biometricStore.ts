import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FaceEmbedding, BiometricEnrollment } from '@/types/api';
import * as SecureStore from 'expo-secure-store';
import { attendanceApi } from '@/lib/api';

interface BiometricState {
  isEnrolled: boolean;
  enrolledAt: string | null;
  enrollmentQuality: number | null;
  faceEmbedding: number[] | null;
  isVerifying: boolean;
  verifyResult: { success: boolean; confidence?: number; message?: string } | null;
  isLoading: boolean;
  error: string | null;

  checkEnrollmentStatus: () => Promise<void>;
  enrollFace: (embedding: number[], quality: number) => Promise<void>;
  verifyFace: (embedding: number[]) => Promise<{ success: boolean; confidence?: number }>;
  clearEnrollment: () => Promise<void>;
  clearError: () => void;
  clearVerifyResult: () => void;
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

export const useBiometricStore = create<BiometricState>()(
  persist(
    (set, get) => ({
      isEnrolled: false,
      enrolledAt: null,
      enrollmentQuality: null,
      faceEmbedding: null,
      isVerifying: false,
      verifyResult: null,
      isLoading: false,
      error: null,

      checkEnrollmentStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const { enrolled, enrolledAt } = await attendanceApi.getBiometricStatus();
          set({ isEnrolled: enrolled, enrolledAt: enrolledAt || null, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
        }
      },

      enrollFace: async (embedding, quality) => {
        set({ isLoading: true, error: null });
        try {
          await attendanceApi.enrollFace({ embedding, quality });
          const enrolledAt = new Date().toISOString();

          await Promise.all([
            SecureStore.setItemAsync('face_embedding', JSON.stringify(embedding)),
            SecureStore.setItemAsync('enrollment_quality', quality.toString()),
            SecureStore.setItemAsync('enrolled_at', enrolledAt),
          ]);

          set({
            isEnrolled: true,
            enrolledAt,
            enrollmentQuality: quality,
            faceEmbedding: embedding,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      verifyFace: async (embedding) => {
        set({ isVerifying: true, error: null, verifyResult: null });
        try {
          const storedEmbeddingStr = await SecureStore.getItemAsync('face_embedding');
          let result: { success: boolean; confidence?: number; message?: string };

          if (storedEmbeddingStr) {
            const storedEmbedding = JSON.parse(storedEmbeddingStr);
            const similarity = cosineSimilarity(embedding, storedEmbedding);
            const threshold = 0.6;

            result = {
              success: similarity >= threshold,
              confidence: similarity,
              message: similarity >= threshold ? 'Wajah dikenali' : 'Wajah tidak cocok',
            };
          } else {
            const serverResult = await attendanceApi.verifyFace({ embedding });
            result = {
              success: serverResult.success,
              confidence: serverResult.confidence,
              message: serverResult.message,
            };
          }

          set({ verifyResult: result, isVerifying: false });
          return { success: result.success, confidence: result.confidence };
        } catch (error: any) {
          const result = { success: false, message: error.message };
          set({ verifyResult: result, isVerifying: false, error: error.message });
          return { success: false };
        }
      },

      clearEnrollment: async () => {
        set({ isLoading: true, error: null });
        try {
          await Promise.all([
            SecureStore.deleteItemAsync('face_embedding'),
            SecureStore.deleteItemAsync('enrollment_quality'),
            SecureStore.deleteItemAsync('enrolled_at'),
          ]);

          set({
            isEnrolled: false,
            enrolledAt: null,
            enrollmentQuality: null,
            faceEmbedding: null,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      clearVerifyResult: () => set({ verifyResult: null }),
    }),
    {
      name: 'biometric-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        isEnrolled: state.isEnrolled,
        enrolledAt: state.enrolledAt,
        enrollmentQuality: state.enrollmentQuality,
        faceEmbedding: state.faceEmbedding,
      }),
    }
  )
);

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

if (typeof window !== 'undefined') {
  (async () => {
    const embeddingStr = await SecureStore.getItemAsync('face_embedding');
    const qualityStr = await SecureStore.getItemAsync('enrollment_quality');
    const enrolledAt = await SecureStore.getItemAsync('enrolled_at');

    if (embeddingStr && qualityStr && enrolledAt) {
      useBiometricStore.setState({
        faceEmbedding: JSON.parse(embeddingStr),
        enrollmentQuality: parseFloat(qualityStr),
        enrolledAt,
        isEnrolled: true,
      });
    }
  })();
}