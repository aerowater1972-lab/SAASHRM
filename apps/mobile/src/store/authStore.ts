import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthTokens, Employee, Permission } from '@/types/api';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  employee: Employee | null;
  tokens: AuthTokens | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; tenantId: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setEmployee: (employee: Employee) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  clearError: () => void;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      employee: null,
      tokens: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string, tenantId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password, tenantId });
          const { user, accessToken, refreshToken, csrfToken, permissions } = response;

          const tokens: AuthTokens = { accessToken, refreshToken, csrfToken, expiresIn: 15 * 60 * 1000 };

          await Promise.all([
            SecureStore.setItemAsync('access_token', accessToken),
            SecureStore.setItemAsync('refresh_token', refreshToken),
            SecureStore.setItemAsync('csrf_token', csrfToken),
            SecureStore.setItemAsync('user_data', JSON.stringify(user)),
          ]);

          set({
            user,
            tokens,
            permissions,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Login failed';
          set({ isLoading: false, error: message, isAuthenticated: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          const { user, accessToken, refreshToken, csrfToken, permissions } = response;

          const tokens: AuthTokens = { accessToken, refreshToken, csrfToken, expiresIn: 15 * 60 * 1000 };

          await Promise.all([
            SecureStore.setItemAsync('access_token', accessToken),
            SecureStore.setItemAsync('refresh_token', refreshToken),
            SecureStore.setItemAsync('csrf_token', csrfToken),
            SecureStore.setItemAsync('user_data', JSON.stringify(user)),
          ]);

          set({
            user,
            tokens,
            permissions,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Registration failed';
          set({ isLoading: false, error: message, isAuthenticated: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const refreshToken = get().tokens?.refreshToken;
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } catch {
          // Ignore logout API errors
        } finally {
          await Promise.all([
            SecureStore.deleteItemAsync('access_token'),
            SecureStore.deleteItemAsync('refresh_token'),
            SecureStore.deleteItemAsync('csrf_token'),
            SecureStore.deleteItemAsync('user_data'),
            SecureStore.deleteItemAsync('tenant_id'),
          ]);

          set({
            user: null,
            employee: null,
            tokens: null,
            permissions: [],
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshSession: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return;

        try {
          const response = await authApi.refresh(tokens.refreshToken);
          const { accessToken, refreshToken, csrfToken } = response;

          const newTokens: AuthTokens = { accessToken, refreshToken, csrfToken, expiresIn: 15 * 60 * 1000 };

          await Promise.all([
            SecureStore.setItemAsync('access_token', accessToken),
            SecureStore.setItemAsync('refresh_token', refreshToken),
            SecureStore.setItemAsync('csrf_token', csrfToken),
          ]);

          set({ tokens: newTokens });
        } catch {
          await get().logout();
          throw new Error('Session expired');
        }
      },

      loadStoredAuth: async () => {
        set({ isLoading: true });
        try {
          const [userData, accessToken, refreshToken, csrfToken] = await Promise.all([
            SecureStore.getItemAsync('user_data'),
            SecureStore.getItemAsync('access_token'),
            SecureStore.getItemAsync('refresh_token'),
            SecureStore.getItemAsync('csrf_token'),
          ]);

          if (userData && accessToken && refreshToken && csrfToken) {
            const user = JSON.parse(userData);
            const tokens: AuthTokens = { accessToken, refreshToken, csrfToken, expiresIn: 15 * 60 * 1000 };

            // Try to fetch fresh user data and permissions
            try {
              const { user: freshUser, permissions } = await authApi.me();
              set({
                user: freshUser,
                tokens,
                permissions,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch {
              // If me() fails, use stored data but mark as needing refresh
              set({
                user,
                tokens,
                permissions: [],
                isAuthenticated: true,
                isLoading: false,
              });
            }
          } else {
            set({ isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ isAuthenticated: false, isLoading: false });
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      setEmployee: (employee) => {
        set({ employee });
      },

      hasPermission: (permission) => {
        return get().permissions.includes(permission);
      },

      hasAnyPermission: (permissions) => {
        return permissions.some((p) => get().permissions.includes(p));
      },

      hasAllPermissions: (permissions) => {
        return permissions.every((p) => get().permissions.includes(p));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        employee: state.employee,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);