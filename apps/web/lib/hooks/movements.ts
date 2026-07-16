import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMovements, createMovement, approveMovement, rejectMovement, fetchDepartments, fetchPositions, fetchEmployees } from '@/lib/api/movements';

export function useMovements() {
  return useQuery({
    queryKey: ['movements'],
    queryFn: fetchMovements,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: fetchDepartments,
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions', 'lookup'],
    queryFn: fetchPositions,
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createMovement(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movements'] }),
  });
}

export function useApproveMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveMovement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movements'] }),
  });
}

export function useRejectMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectMovement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movements'] }),
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees', 'lookup'],
    queryFn: fetchEmployees,
  });
}
