'use client';
import { RequirePermission } from '@/components/require-permission';
import { useState } from 'react';
import {
  useMyTimesheetWeek,
  useUpsertTimesheetEntry,
  useDeleteTimesheetEntry,
  useSubmitTimesheetWeek,
} from '@/lib/hooks/timesheet';
import type { TimesheetCell } from '@/lib/api/timesheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, TableSkeleton, ErrorState } from '@/components/ui/data-states';
import { ChevronLeft, ChevronRight, Trash2, Send, Lock } from 'lucide-react';

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function shiftAnchor(anchor: string | undefined, days: number): string {
  const base = anchor ? new Date(`${anchor}T00:00:00.000Z`) : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export default function TimesheetPage() {
  return (
    <RequirePermission permission="tasks:view">
      <TimesheetInner />
    </RequirePermission>
  );
}

function TimesheetInner() {
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const { data, isLoading, error } = useMyTimesheetWeek(anchor);
  const upsert = useUpsertTimesheetEntry(anchor);
  const remove = useDeleteTimesheetEntry(anchor);
  const submit = useSubmitTimesheetWeek();

  if (isLoading) return <TableSkeleton columns={8} />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const editCell = (taskId: string | null, projectId: string | null, day: string, current: TimesheetCell | undefined) => {
    const raw = window.prompt(`Jam untuk ${day}${current?.description ? ` — ${current.description}` : ''} (kosongkan untuk hapus):`, current ? String(current.hours) : '');
    if (raw === null) return;
    if (raw.trim() === '') {
      if (current?.entryId) remove.mutate(current.entryId);
      return;
    }
    const hours = Number(raw.replace(',', '.'));
    if (Number.isNaN(hours) || hours <= 0 || hours > 24) {
      window.alert('Jam harus antara 0.25 dan 24');
      return;
    }
    upsert.mutate({
      taskId: taskId ?? undefined,
      projectId: projectId ?? undefined,
      workDate: day,
      hours,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
          <p className="text-sm text-muted-foreground">
            Catat jam kerja per tugas/proyek. Entri disubmit untuk approval dan menjadi dasar payroll.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchor(shiftAnchor(anchor ?? data.weekStart, -7))} aria-label="Minggu sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium whitespace-nowrap">
            {data.weekStart} s/d {data.weekEnd}
          </span>
          <Button variant="outline" size="icon" onClick={() => setAnchor(shiftAnchor(anchor ?? data.weekEnd, 7))} aria-label="Minggu berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {data.locked && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <Lock className="h-4 w-4 shrink-0" />
          Periode payroll untuk minggu ini sudah ditutup/dikunci — timesheet tidak dapat diubah.
        </div>
      )}

      {data.rows.length === 0 ? (
        <EmptyState
          title="Belum ada jam tercatat minggu ini"
          description="Klik salah satu sel di bawah (atau gunakan prompt jam) untuk mencatat jam kerja per tugas."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Grid Mingguan ({data.weekStart} — {data.weekEnd})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium">Tugas / Proyek</th>
                    {data.days.map((d, i) => (
                      <th key={d} className="text-center py-2 px-2 font-medium whitespace-nowrap">
                        {DAY_LABELS[i] ?? ''}
                        <div className="text-xs text-muted-foreground font-normal">{d.slice(8)}/{d.slice(5, 7)}</div>
                      </th>
                    ))}
                    <th className="text-right py-2 px-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={`${row.taskId ?? 'p'}-${row.projectId ?? 'n'}`} className="border-b last:border-0">
                      <td className="py-2 pr-3 max-w-[260px]">
                        <div className="truncate font-medium">{row.taskTitle}</div>
                        {row.projectName && <div className="truncate text-xs text-muted-foreground">{row.projectName}</div>}
                      </td>
                      {data.days.map((d) => {
                        const cell = row.cells[d];
                        return (
                          <td key={d} className="text-center px-1 py-1">
                            <button
                              type="button"
                              disabled={data.locked}
                              onClick={() => editCell(row.taskId, row.projectId, d, cell)}
                              className={`w-14 rounded px-1 py-1 text-center hover:bg-accent ${cell ? '' : 'text-muted-foreground'}`}
                              title={cell?.description ?? 'Klik untuk edit jam'}
                            >
                              {cell ? (
                                <span className="inline-flex flex-col items-center leading-tight">
                                  <span className="font-medium">{cell.hours}</span>
                                  {cell.status && cell.status !== 'DRAFT' && (
                                    <Badge variant={cell.status === 'APPROVED' ? 'default' : cell.status === 'REJECTED' ? 'destructive' : 'secondary'} className="text-[9px] px-1 py-0">
                                      {cell.status}
                                    </Badge>
                                  )}
                                </span>
                              ) : (
                                <span className="opacity-40">·</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="text-right px-2 py-2 font-semibold">{row.total}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2 pr-3">Total per hari</td>
                    {data.days.map((d) => (
                      <td key={d} className="text-center px-2 py-2">{data.dayTotals[d] || 0}</td>
                    ))}
                    <td className="text-right px-2 py-2">{data.grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          disabled={data.locked || data.grandTotal <= 0 || submit.isPending}
          onClick={() => submit.mutate(data.weekStart)}
        >
          <Send className="mr-2 h-4 w-4" />
          Submit Minggu Ini
        </Button>
      </div>
    </div>
  );
}

