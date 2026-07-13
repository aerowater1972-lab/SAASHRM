export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1';

export const DEFAULT_TENANT = 'default';

const TOKEN_KEY = 'flexy.accessToken';
const TENANT_KEY = 'flexy.tenantId';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getTenantId(): string {
  if (typeof window === 'undefined') return DEFAULT_TENANT;
  return window.localStorage.getItem(TENANT_KEY) || DEFAULT_TENANT;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName?: string; roles?: string[] };
}

export const api = {
  async login(email: string, password: string, tenantId: string): Promise<LoginResult> {
    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || 'Login failed');
    }
    return res.json();
  },

  async logout(token: string): Promise<void> {
    await fetch(`${API_BASE}/admin/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  },

  async get<T>(path: string, config?: { params?: Record<string, unknown> }): Promise<T> {
    const res = await fetch(buildUrl(path, config?.params), {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  },

  async post<T>(path: string, body?: unknown, config?: { params?: Record<string, unknown> }): Promise<T> {
    const res = await fetch(buildUrl(path, config?.params), {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  },

  async put<T>(path: string, body?: unknown, config?: { params?: Record<string, unknown> }): Promise<T> {
    const res = await fetch(buildUrl(path, config?.params), {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  },

  async delete<T>(path: string, config?: { params?: Record<string, unknown> }): Promise<T> {
    const res = await fetch(buildUrl(path, config?.params), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  },
};

export function buildUrl(path: string, params?: Record<string, unknown>): string {
  if (!params) return `${API_BASE}${path}`;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${API_BASE}${path}?${qs}` : `${API_BASE}${path}`;
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'x-tenant-id': getTenantId() };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function persistSession(result: LoginResult, tenantId: string): void {
  window.localStorage.setItem(TOKEN_KEY, result.accessToken);
  window.localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TENANT_KEY);
}

export function decodeToken(): { sub: string; email: string; employeeId?: string; permissions?: string[] } | null {
  if (typeof window === 'undefined') return null;
  const token = getToken();
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return null; }
}

export function hasPermission(perm: string): boolean {
  if (typeof window === 'undefined') return false;
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.permissions?.includes(perm) ?? false;
  } catch { return false; }
}
