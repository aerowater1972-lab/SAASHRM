import { api, API_BASE, getTenantId } from '@/lib/api';

export interface EbupotListParams {
  taxYear?: number;
  taxMonth?: number;
  status?: string;
}

export async function fetchEbupotSubmissions(params?: EbupotListParams): Promise<any[]> {
  const res: any = await api.get('/tax/ebupot', { params: params as Record<string, unknown> });
  return Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
}

export async function fetchEbupotStats(): Promise<any> {
  return api.get('/tax/ebupot/stats');
}

export async function generateEbupot(data: { taxYear: number; taxMonth: number; payrollRunId?: string }): Promise<any> {
  return api.post('/tax/ebupot/generate', data);
}

export async function submitEbupot(taxYear: number, taxMonth: number): Promise<any> {
  return api.post('/tax/ebupot/submit', { taxYear, taxMonth });
}

export async function retryEbupot(id: string): Promise<any> {
  return api.post(`/tax/ebupot/${id}/retry`, {});
}

export async function bulkRetryEbupot(ids: string[]): Promise<any> {
  return api.post('/tax/ebupot/bulk-retry', { ids });
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'x-tenant-id': getTenantId() };
  if (typeof window !== 'undefined') {
    try {
      // Reuse bearer token from sessionStorage pattern used by api client
      const raw = window.sessionStorage.getItem('flexy.session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.accessToken) headers['Authorization'] = `Bearer ${s.accessToken}`;
      }
    } catch { /* ignore */ }
  }
  return headers;
}

export function ebupotExportUrl(kind: 'export.xml' | 'export.csv', taxYear: number, taxMonth: number): string {
  return `${API_BASE}/tax/ebupot/${kind}?taxYear=${taxYear}&taxMonth=${taxMonth}`;
}

export async function downloadEbupotExport(kind: 'export.xml' | 'export.csv', taxYear: number, taxMonth: number): Promise<void> {
  const res = await fetch(ebupotExportUrl(kind, taxYear, taxMonth), {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Export gagal: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = kind === 'export.xml' ? `ebupot-${taxYear}-${taxMonth}.xml` : `ebupot-${taxYear}-${taxMonth}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
