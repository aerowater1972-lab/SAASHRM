import { api } from '@/lib/api';

// --- Live Tracking (attendance/live-tracking) ---

export interface LiveFieldWorker {
  id: string;
  fullName: string;
  employeeId: string;
  profilePicture?: string | null;
  lastPing?: { lat: number; lng: number; recordedAt: string; accuracyMeters?: number | null };
}

export interface Territory {
  id: string;
  employeeId: string;
  territoryName: string;
  boundaryGeoJson: string;
  employee?: { id: string; fullName: string; employeeId: string };
}

export interface TerritoryViolation {
  id: string;
  employeeId: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  notified: boolean;
  recordedAt: string;
  employee?: { id: string; fullName: string; employeeId: string };
  territory?: { id: string; territoryName: string };
}

export async function fetchLiveFieldWorkers(): Promise<LiveFieldWorker[]> {
  return api.get<LiveFieldWorker[]>('/attendance/live-tracking/field-workers/live');
}

export async function fetchTerritories(): Promise<Territory[]> {
  return api.get<Territory[]>('/attendance/live-tracking/territories');
}

export async function createTerritory(data: { employeeId: string; territoryName: string; boundaryGeoJson: string }): Promise<Territory> {
  return api.post<Territory>('/attendance/live-tracking/territories', data);
}

export async function updateTerritory(id: string, data: { territoryName?: string; boundaryGeoJson?: string }): Promise<Territory> {
  return api.put<Territory>(`/attendance/live-tracking/territories/${id}`, data);
}

export async function deleteTerritory(id: string): Promise<any> {
  return api.delete(`/attendance/live-tracking/territories/${id}`);
}

export async function fetchViolations(params?: {
  employeeId?: string;
  notified?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: TerritoryViolation[]; total: number; page: number; pageSize: number }> {
  return api.get('/attendance/live-tracking/violations', { params: params as Record<string, unknown> });
}

/** Buat tautan peta statis (Google Maps) dari koordinat. */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
