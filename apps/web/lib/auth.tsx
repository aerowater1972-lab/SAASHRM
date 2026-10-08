'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, LoginResult, persistSession, clearSession, getToken, getTenantId, restoreSession } from './api';

interface AuthState {
  token: string | null;
  tenantId: string;
  user: LoginResult['user'] | null;
  ready: boolean;
  login: (email: string, password: string, tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>('default');
  const [user, setUser] = useState<LoginResult['user'] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setTenantId(getTenantId());
      if (getToken()) {
        setToken(getToken());
        setReady(true);
        return;
      }
      // No in-memory token (e.g. after reload): try silent cookie restore.
      try {
        const identity = await restoreSession();
        if (identity) {
          setToken(getToken());
          setTenantId(identity.user.tenantId || getTenantId());
        }
      } catch {
        /* stay logged out */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function login(email: string, password: string, tenant: string) {
    const result = await api.login(email, password, tenant);
    persistSession(result, tenant);
    setToken(result.accessToken);
    setTenantId(tenant);
    setUser(result.user);
  }

  async function logout() {
    if (token) await api.logout(token);
    clearSession();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, tenantId, user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
