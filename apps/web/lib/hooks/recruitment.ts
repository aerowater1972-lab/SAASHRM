import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import {
  fetchJobs, fetchJob, fetchCandidates, fetchCandidate,
  fetchApplications, fetchApplication,
  fetchRequisitions, createRequisition, updateRequisitionStatus,
  getPipeline, updateApplicationStatus,
  publishJob, closeJob,
} from '@/lib/api/recruitment';

export function useJobList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const query = useQuery({
    queryKey: ['jobs', { page, limit, q: search || undefined }],
    queryFn: () => fetchJobs({ page, limit, q: search || undefined }),
    placeholderData: keepPreviousData,
  });

  return {
    rows: query.data?.data || [],
    total: query.data?.total || 0,
    page, setPage, search,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    isLoading: query.isLoading, error: query.error, refetch: query.refetch,
  };
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => fetchJob(id),
    enabled: !!id,
  });
}

export function useCandidateList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const query = useQuery({
    queryKey: ['candidates', { page, limit, q: search || undefined }],
    queryFn: () => fetchCandidates({ page, limit, q: search || undefined }),
    placeholderData: keepPreviousData,
  });

  return {
    rows: query.data?.data || [],
    total: query.data?.total || 0,
    page, setPage, search,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    isLoading: query.isLoading, error: query.error, refetch: query.refetch,
  };
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: ['candidates', id],
    queryFn: () => fetchCandidate(id),
    enabled: !!id,
  });
}

export function useApplications() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const query = useQuery({
    queryKey: ['applications', { page, limit, q: search || undefined }],
    queryFn: () => fetchApplications({ page, limit, q: search || undefined }),
    placeholderData: keepPreviousData,
  });

  return {
    rows: query.data?.data || [],
    total: query.data?.total || 0,
    page, setPage, search,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    isLoading: query.isLoading, error: query.error, refetch: query.refetch,
  };
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['applications', id],
    queryFn: () => fetchApplication(id),
    enabled: !!id,
  });
}

export function useRequisitions() {
  return useQuery({
    queryKey: ['requisitions'],
    queryFn: fetchRequisitions,
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createRequisition(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  });
}

export function useUpdateRequisitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateRequisitionStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ['recruitment', 'pipeline'],
    queryFn: getPipeline,
  });
}

export function useUpdateApplicationStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateApplicationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'pipeline'] }),
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateApplicationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'applications'] }),
  });
}

export function usePublishJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'jobs'] }),
  });
}

export function useCloseJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'jobs'] }),
  });
}
