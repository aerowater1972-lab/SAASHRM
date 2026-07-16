import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCalibrations, createCalibration, finalizeCalibration, fetchCyclesLookup, fetchEmployeesLookup } from '@/lib/api/calibrations';

export function useCalibrations() {
  return useQuery({
    queryKey: ['calibrations'],
    queryFn: fetchCalibrations,
  });
}

export function useCyclesLookup() {
  return useQuery({
    queryKey: ['cycles', 'lookup'],
    queryFn: fetchCyclesLookup,
  });
}

export function useEmployeesLookup() {
  return useQuery({
    queryKey: ['employees', 'lookup'],
    queryFn: fetchEmployeesLookup,
  });
}

export function useCreateCalibration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createCalibration(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calibrations'] }),
  });
}

export function useFinalizeCalibration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => finalizeCalibration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calibrations'] }),
  });
}
