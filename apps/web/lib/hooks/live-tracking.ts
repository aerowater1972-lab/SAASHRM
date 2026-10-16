import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLiveFieldWorkers,
  fetchTerritories,
  createTerritory,
  updateTerritory,
  deleteTerritory,
  fetchViolations,
  fetchDailyVisitReport,
} from '@/lib/api/live-tracking';

export function useLiveFieldWorkers() {
  return useQuery({ queryKey: ['live-tracking', 'field-workers'], queryFn: fetchLiveFieldWorkers, refetchInterval: 30_000 });
}

export function useTerritories() {
  return useQuery({ queryKey: ['live-tracking', 'territories'], queryFn: fetchTerritories });
}

export function useCreateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTerritory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-tracking', 'territories'] }),
  });
}

export function useUpdateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: {
        employeeId?: string;
        departmentId?: string;
        territoryName?: string;
        boundaryGeoJson?: string;
      };
    }) => updateTerritory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-tracking', 'territories'] }),
  });
}

export function useDailyVisitReport(params?: { date?: string; departmentId?: string; employeeId?: string }) {
  return useQuery({
    queryKey: ['live-tracking', 'daily-visit-report', params ?? {}],
    queryFn: () => fetchDailyVisitReport(params),
    enabled: !!params?.date || true,
  });
}

export function useDeleteTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTerritory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-tracking', 'territories'] }),
  });
}

export function useViolations(params?: { employeeId?: string; notified?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['live-tracking', 'violations', params ?? {}],
    queryFn: () => fetchViolations(params),
    refetchInterval: 30_000,
  });
}
