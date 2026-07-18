import { api } from '@/lib/api';

export type BiometricType = 'FINGERPRINT' | 'FACE';

export async function enrollBiometric(data: {
  type: BiometricType;
  reference: string;
  deviceId?: string;
}): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>('/attendance/biometric/enroll', data);
}

export type BiometricCredential = {
  id: string;
  tenantId: string;
  employeeId: string;
  type: BiometricType;
  reference: string;
  deviceId: string | null;
  isActive: boolean;
  enrolledAt: string;
  updatedAt: string;
};

export async function enrollBiometricForEmployee(data: {
  employeeId: string;
  type: BiometricType;
  reference: string;
  deviceId?: string;
}): Promise<BiometricCredential> {
  return api.post<BiometricCredential>('/attendance/biometric/admin/enroll', data);
}

export async function listBiometricsForEmployee(
  employeeId: string,
): Promise<BiometricCredential[]> {
  return api.get<BiometricCredential[]>(`/attendance/biometric/admin/${employeeId}`);
}

export async function setBiometricActive(
  id: string,
  isActive: boolean,
): Promise<BiometricCredential> {
  return api.patch<BiometricCredential>(`/attendance/biometric/admin/credential/${id}`, { isActive });
}

export async function deleteBiometricCredential(id: string): Promise<{ id: string; deleted: boolean }> {
  return api.delete<{ id: string; deleted: boolean }>(`/attendance/biometric/admin/credential/${id}`);
}

export async function verifyFace(data: { embedding: number[] }): Promise<{ matched: boolean; score: number }> {
  return api.post<{ matched: boolean; score: number }>('/attendance/biometric/verify', data);
}

export type AntiSpoofThresholds = {
  maxGpsAccuracy: number;
  maxClockSkewMs: number;
  maxTravelSpeedKmh: number;
};

export type AntiSpoofSettings = {
  effective: AntiSpoofThresholds;
  overrides: Partial<AntiSpoofThresholds>;
  defaults: AntiSpoofThresholds;
};

export type AntiSpoofUpdate = {
  maxGpsAccuracy?: number | null;
  maxClockSkewMs?: number | null;
  maxTravelSpeedKmh?: number | null;
};

export async function getAntiSpoofSettings(): Promise<AntiSpoofSettings> {
  return api.get<AntiSpoofSettings>('/attendance/anti-spoof/settings');
}

export async function updateAntiSpoofSettings(
  data: AntiSpoofUpdate,
): Promise<AntiSpoofSettings> {
  return api.put<AntiSpoofSettings>('/attendance/anti-spoof/settings', data);
}
