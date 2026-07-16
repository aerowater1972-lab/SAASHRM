import { api } from '@/lib/api';
import type { CalibrationSession } from '@/lib/types';

export async function fetchCalibrations(): Promise<CalibrationSession[]> {
  const res: any = await api.get('/performance/calibrations');
  return Array.isArray(res) ? res : (res.data ?? []);
}

export async function createCalibration(data: any): Promise<CalibrationSession> {
  return api.post('/performance/calibrations', data);
}

export async function finalizeCalibration(id: string): Promise<CalibrationSession> {
  return api.put(`/performance/calibrations/${id}/finalize`, {});
}

export async function fetchCyclesLookup(): Promise<any[]> {
  const res: any = await api.get('/performance/cycles');
  return Array.isArray(res) ? res : (res.data ?? []);
}

export async function fetchEmployeesLookup(): Promise<any[]> {
  const res: any = await api.get('/employees');
  return Array.isArray(res) ? res : (res.data ?? []);
}
