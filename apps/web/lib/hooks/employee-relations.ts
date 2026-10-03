'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchViolationCategories,
  createViolationCategory,
  fetchDisciplinaryCases,
  createDisciplinaryCase,
  approveDisciplinaryCase,
  acknowledgeDisciplinaryCase,
  fetchIncidentReports,
  createIncidentReport,
  updateIncidentReport,
  fetchPpeAssignments,
  createPpeAssignment,
  expirePpeAssignment,
  fetchK3Dashboard,
  fetchK3TrainingCompliance,
  fetchK3TrainingRecommendations,
  fetchBranding,
  upsertBranding,
  reportGrievance,
  fetchGrievances,
  assignGrievanceHandler,
  advanceGrievance,
  fetchBipartiteSessions,
  scheduleBipartite,
  holdBipartite,
  closeBipartite,
} from '@/lib/api/employee-relations';

export function useViolationCategories() {
  return useQuery({ queryKey: ['violation-categories'], queryFn: fetchViolationCategories });
}
export function useCreateViolationCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createViolationCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['violation-categories'] }),
  });
}

export function useDisciplinaryCases(employeeId?: string) {
  return useQuery({
    queryKey: ['disciplinary-cases', employeeId],
    queryFn: () => fetchDisciplinaryCases(employeeId),
  });
}
export function useCreateDisciplinaryCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDisciplinaryCase,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disciplinary-cases'] }),
  });
}
export function useApproveDisciplinaryCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approvedById }: { id: string; approvedById: string }) =>
      approveDisciplinaryCase(id, approvedById),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disciplinary-cases'] }),
  });
}
export function useAcknowledgeDisciplinaryCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeDisciplinaryCase(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disciplinary-cases'] }),
  });
}

export function useIncidentReports(status?: string, severity?: string) {
  return useQuery({
    queryKey: ['incident-reports', status, severity],
    queryFn: () => fetchIncidentReports(status, severity),
  });
}
export function useCreateIncidentReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createIncidentReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incident-reports'] }),
  });
}
export function useUpdateIncidentReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateIncidentReport(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incident-reports'] }),
  });
}

export function usePpeAssignments(employeeId?: string) {
  return useQuery({
    queryKey: ['ppe-assignments', employeeId],
    queryFn: () => fetchPpeAssignments(employeeId),
  });
}
export function useCreatePpeAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPpeAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ppe-assignments'] }),
  });
}
export function useExpirePpeAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expirePpeAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ppe-assignments'] }),
  });
}

export function useK3Dashboard() {
  return useQuery({ queryKey: ['k3-dashboard'], queryFn: fetchK3Dashboard });
}

export function useK3TrainingCompliance() {
  return useQuery({ queryKey: ['k3-training-compliance'], queryFn: fetchK3TrainingCompliance });
}
export function useK3TrainingRecommendations(violationCategoryId?: string) {
  return useQuery({
    queryKey: ['k3-training-recommendations', violationCategoryId],
    queryFn: () => fetchK3TrainingRecommendations(violationCategoryId),
    enabled: !!violationCategoryId,
  });
}

export function useBranding() {
  return useQuery({ queryKey: ['branding'], queryFn: fetchBranding });
}
export function useUpsertBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertBranding,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branding'] }),
  });
}

export function useGrievances() {
  return useQuery({ queryKey: ['collective', 'grievances'], queryFn: fetchGrievances });
}
export function useReportGrievance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportGrievance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collective', 'grievances'] }),
  });
}
export function useAssignGrievanceHandler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, handlerUserId }: { id: string; handlerUserId: string }) =>
      assignGrievanceHandler(id, handlerUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collective', 'grievances'] }),
  });
}
export function useAdvanceGrievance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { to: string; resolution?: string } }) =>
      advanceGrievance(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collective', 'grievances'] }),
  });
}
export function useBipartiteSessions() {
  return useQuery({ queryKey: ['collective', 'bipartite'], queryFn: fetchBipartiteSessions });
}
export function useScheduleBipartite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: scheduleBipartite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collective', 'bipartite'] }),
  });
}
export function useHoldBipartite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, data,
    }: {
      id: string;
      data: { minutes: string; followUps?: { task: string; owner: string; dueDate: string }[] };
    }) => holdBipartite(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collective', 'bipartite'] }),
  });
}
export function useCloseBipartite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, data,
    }: {
      id: string;
      data?: { followUps?: { task: string; owner: string; dueDate: string; done: boolean }[] };
    }) => closeBipartite(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collective', 'bipartite'] }),
  });
}
