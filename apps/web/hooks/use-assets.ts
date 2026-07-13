'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  assignedTo?: any
  [key: string]: any
}

export function useAssets() {
  return useQuery({
    queryKey: queryKeys.assets.all,
    queryFn: () => api.get<Asset[]>('/assets'),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Asset>('/assets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.assets.all }); },
  });
}
