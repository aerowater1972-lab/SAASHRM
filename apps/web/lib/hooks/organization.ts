import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchDepartments,
  fetchDepartment,
  createDepartment,
  updateDepartment,
  fetchPositions,
  createPosition,
  updatePosition,
  fetchGrades,
  createGrade,
  fetchOrganizationTree,
  fetchOrgChart,
} from '@/lib/api/organization';
import type { CreateDepartmentInput, CreatePositionInput, CreateGradeInput } from '@/lib/schemas/organization';

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments.all,
    queryFn: fetchDepartments,
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: ['departments', 'detail', id],
    queryFn: () => fetchDepartment(id),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) => createDepartment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function usePositions() {
  return useQuery({
    queryKey: queryKeys.positions.all,
    queryFn: fetchPositions,
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePositionInput) => createPosition(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.positions.all });
    },
  });
}

export function useGrades() {
  return useQuery({
    queryKey: ['grades'],
    queryFn: fetchGrades,
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGradeInput) => createGrade(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
  });
}

export function useOrganizationTree() {
  return useQuery({
    queryKey: ['organization', 'tree'],
    queryFn: fetchOrganizationTree,
  });
}

export function useOrgChart(effectiveDate?: string) {
  return useQuery({
    queryKey: ['org-chart', effectiveDate],
    queryFn: () => fetchOrgChart(effectiveDate),
  });
}
