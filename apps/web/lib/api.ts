export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1';

export const DEFAULT_TENANT = 'default';

const TENANT_KEY = 'flexy.tenantId';

// Session tokens live in memory only (never localStorage) so XSS cannot
// persist them. The server also sets httpOnly cookies, which authenticate
// requests via `credentials: include` even after a page reload.
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;
let memoryPermissions: string[] | null = null;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return memoryAccessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return memoryRefreshToken;
}

export function getTenantId(): string {
  if (typeof window === 'undefined') return DEFAULT_TENANT;
  return window.localStorage.getItem(TENANT_KEY) || DEFAULT_TENANT;
}

function setTokens(accessToken: string, refreshToken: string) {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  permissions?: string[];
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

  async logout(token: string | null): Promise<void> {
    await fetch(`${API_BASE}/admin/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
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
  memoryAccessToken = result.accessToken;
  memoryRefreshToken = result.refreshToken;
  if (result.permissions) memoryPermissions = result.permissions;
  window.localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearSession(): void {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  memoryPermissions = null;
  window.localStorage.removeItem(TENANT_KEY);
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      // Prefer the in-memory refresh token; fall back to the httpOnly
      // refresh cookie (sent automatically) after a page reload.
      const body: Record<string, string> = {};
      if (memoryRefreshToken) body.refreshToken = memoryRefreshToken;
      const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const nextAccess = data.accessToken ?? data.access_token;
      const nextRefresh = data.refreshToken ?? data.refresh_token ?? memoryRefreshToken;
      if (!nextAccess) return null;
      if (data.permissions) memoryPermissions = data.permissions;
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

export interface SessionIdentity {
  user: { id: string; email: string; tenantId: string; employeeId?: string | null };
  permissions: string[];
}

export async function fetchMe(): Promise<SessionIdentity> {
  const res = await fetch(`${API_BASE}/admin/auth/me`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Session expired. Please login again.');
  return res.json();
}

/** Restore a session after reload using the httpOnly cookies. Returns identity or null. */
export async function restoreSession(): Promise<SessionIdentity | null> {
  const access = await refreshAccessToken();
  if (!access) return null;
  try {
    const identity = await fetchMe();
    if (identity.permissions?.length) memoryPermissions = identity.permissions;
    return identity;
  } catch {
    return null;
  }
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
  // Authoritative list from login/me response (JWTs are slim by design).
  if (memoryPermissions) return memoryPermissions.includes(perm);
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.permissions?.includes(perm) ?? false;
  } catch { return false; }
}
