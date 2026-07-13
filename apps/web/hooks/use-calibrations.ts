'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface CalibrationSession {
  id: string;
  name?: string;
  status: string;
  cycleId?: string;
  cycle?: any
  facilitator?: any
  sessionDate: string;
  overallRating?: number;
  finalScores?: any[];
  [key: string]: any
}

export function useCalibrations() {
  return useQuery({
    queryKey: queryKeys.calibrations.all,
    queryFn: () => api.get<CalibrationSession[]>('/performance/calibrations'),
  });
}

export function useFinalizeCalibration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Record<string, any>>(`/performance/calibrations/${id}/finalize`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.calibrations.all }),
  });
}
