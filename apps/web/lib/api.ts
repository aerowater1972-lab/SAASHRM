export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1';

export const DEFAULT_TENANT = 'default';

const TOKEN_KEY = 'flexy.accessToken';
const REFRESH_KEY = 'flexy.refreshToken';
const TENANT_KEY = 'flexy.tenantId';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function getTenantId(): string {
  if (typeof window === 'undefined') return DEFAULT_TENANT;
  return window.localStorage.getItem(TENANT_KEY) || DEFAULT_TENANT;
}

function setTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
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
      credentials: 'include',
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
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  },

  async get<T>(path: string, config?: { params?: Record<string, unknown> }): Promise<T> {
    return request<T>('GET', path, { params: config?.params });
  },

  async post<T>(path: string, body?: unknown, config?: { params?: Record<string, unknown> }): Promise<T> {
    return request<T>('POST', path, { params: config?.params, body });
  },

  async put<T>(path: string, body?: unknown, config?: { params?: Record<string, unknown> }): Promise<T> {
    return request<T>('PUT', path, { params: config?.params, body });
  },

  async patch<T>(path: string, body?: unknown, config?: { params?: Record<string, unknown> }): Promise<T> {
    return request<T>('PATCH', path, { params: config?.params, body });
  },

  async delete<T>(path: string, config?: { params?: Record<string, unknown> }): Promise<T> {
    return request<T>('DELETE', path, { params: config?.params });
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
  window.localStorage.setItem(REFRESH_KEY, result.refreshToken);
  window.localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(TENANT_KEY);
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const nextAccess = data.accessToken ?? data.access_token;
      const nextRefresh = data.refreshToken ?? data.refresh_token ?? refreshToken;
      if (!nextAccess) return null;
      setTokens(nextAccess, nextRefresh);
      return nextAccess;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(
  method: string,
  path: string,
  opts: { params?: Record<string, unknown>; body?: unknown } = {},
): Promise<T> {
  const url = buildUrl(path, opts.params);
  const headers: Record<string, string> = { ...authHeaders() };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const doFetch = () => fetch(url, {
    method,
    credentials: 'include',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let res = await doFetch();

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await doFetch();
    }
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* body not JSON */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
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
