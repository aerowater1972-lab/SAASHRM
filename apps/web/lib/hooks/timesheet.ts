import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyWeek,
  fetchEmployeeWeek,
  upsertTimesheetEntry,
  deleteTimesheetEntry,
  submitTimesheetWeek,
  approveTimesheetEntry,
  rejectTimesheetEntry,
  fetchApprovedSummary,
  UpsertTimesheetEntryPayload,
} from '@/lib/api/timesheet';

export function useMyTimesheetWeek(anchor?: string) {
  return useQuery({
    queryKey: ['timesheet', 'my', anchor ?? 'current'],
    queryFn: () => fetchMyWeek(anchor),
  });
}

export function useEmployeeTimesheetWeek(employeeId: string | null, anchor?: string) {
  return useQuery({
    queryKey: ['timesheet', 'employee', employeeId, anchor ?? 'current'],
    queryFn: () => fetchEmployeeWeek(employeeId!, anchor),
    enabled: !!employeeId,
  });
}

export function useUpsertTimesheetEntry(anchor?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertTimesheetEntryPayload) => upsertTimesheetEntry(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });
}

export function useDeleteTimesheetEntry(anchor?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => deleteTimesheetEntry(entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });
}

export function useSubmitTimesheetWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (anchor: string) => submitTimesheetWeek(anchor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });
}

export function useReviewTimesheetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, approve }: { entryId: string; approve: boolean }) =>
      approve ? approveTimesheetEntry(entryId) : rejectTimesheetEntry(entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });
}

export function useApprovedTimesheetSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['timesheet', 'approved-summary', startDate, endDate],
    queryFn: () => fetchApprovedSummary(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
  });
}
