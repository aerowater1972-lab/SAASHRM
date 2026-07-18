import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  enrollBiometric,
  enrollBiometricForEmployee,
  listBiometricsForEmployee,
  setBiometricActive,
  deleteBiometricCredential,
  verifyFace,
  getAntiSpoofSettings,
  updateAntiSpoofSettings,
  AntiSpoofUpdate,
  BiometricType,
} from '@/lib/api/biometric';

export function useEnrollBiometric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: BiometricType; reference: string; deviceId?: string }) =>
      enrollBiometric(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'biometric'] });
    },
  });
}

export function useEnrollBiometricForEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; type: BiometricType; reference: string; deviceId?: string }) =>
      enrollBiometricForEmployee(data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'biometric', vars.employeeId] });
    },
  });
}

export function useBiometricsForEmployee(employeeId?: string) {
  return useQuery({
    queryKey: ['admin', 'biometric', employeeId],
    queryFn: () => listBiometricsForEmployee(employeeId as string),
    enabled: !!employeeId,
  });
}

export function useSetBiometricActive(employeeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setBiometricActive(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'biometric', employeeId] });
    },
  });
}

export function useDeleteBiometricCredential(employeeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBiometricCredential(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'biometric', employeeId] });
    },
  });
}

export function useVerifyFace() {
  return useMutation({
    mutationFn: (data: { embedding: number[] }) => verifyFace(data),
  });
}

export function useAntiSpoofSettings() {
  return useQuery({
    queryKey: ['admin', 'anti-spoof', 'settings'],
    queryFn: () => getAntiSpoofSettings(),
  });
}

export function useUpdateAntiSpoofSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AntiSpoofUpdate) => updateAntiSpoofSettings(data),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'anti-spoof', 'settings'], data);
      qc.invalidateQueries({ queryKey: ['admin', 'anti-spoof', 'settings'] });
    },
  });
}
