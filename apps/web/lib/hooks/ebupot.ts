import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEbupotSubmissions,
  fetchEbupotStats,
  generateEbupot,
  submitEbupot,
  retryEbupot,
  bulkRetryEbupot,
  type EbupotListParams,
} from '@/lib/api/ebupot';

export function useEbupotSubmissions(params?: EbupotListParams) {
  return useQuery({ queryKey: ['ebupot', 'submissions', params], queryFn: () => fetchEbupotSubmissions(params) });
}

export function useEbupotStats() {
  return useQuery({ queryKey: ['ebupot', 'stats'], queryFn: fetchEbupotStats });
}

export function useGenerateEbupot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof generateEbupot>[0]) => generateEbupot(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ebupot'] });
    },
  });
}

export function useSubmitEbupot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taxYear, taxMonth }: { taxYear: number; taxMonth: number }) => submitEbupot(taxYear, taxMonth),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ebupot'] }),
  });
}

export function useRetryEbupot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryEbupot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ebupot'] }),
  });
}

export function useBulkRetryEbupot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkRetryEbupot(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ebupot'] }),
  });
}
