'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/data-states';
import { CheckCircle2, Clock, Trash2, XCircle, AlertTriangle } from 'lucide-react';
import type { SurveyActionItem, ActionItemStatus } from '@/lib/types';

const STATUS_VARIANT: Record<ActionItemStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

const STATUS_LABEL: Record<ActionItemStatus, string> = {
  PENDING: 'Belum mulai',
  IN_PROGRESS: 'Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

/** Progress bar (0-100) shared by the survey-scoped and cross-survey views. */
export function ActionItemProgressBar({ progress, isOverdue }: { progress: number; isOverdue?: boolean }) {
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-green-600' : isOverdue ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

/** QW-03: action item row with owner, deadline, status and progress controls. */
export function ActionItemRow({
  item,
  canManage,
  onUpdateStatus,
  onUpdateProgress,
  onDelete,
}: {
  item: SurveyActionItem;
  canManage?: boolean;
  onUpdateStatus?: (id: string, status: ActionItemStatus) => void;
  onUpdateProgress?: (id: string, progress: number) => void;
  onDelete?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<string>(String(item.progress ?? 0));
  const isOpen = item.status !== 'COMPLETED' && item.status !== 'CANCELLED';

  function commitProgress() {
    const value = Math.max(0, Math.min(100, Number(draft) || 0));
    if (value !== item.progress) onUpdateProgress?.(item.id, value);
    else setDraft(String(item.progress ?? 0));
  }

  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{item.title}</p>
          <Badge variant={STATUS_VARIANT[item.status] ?? 'secondary'}>
            {STATUS_LABEL[item.status] ?? item.status}
          </Badge>
          {item.isOverdue && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Terlambat
            </Badge>
          )}
        </div>
        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
        {item.survey?.title && <p className="text-xs text-muted-foreground">Survei: {item.survey.title}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Owner: {item.assigneeId}</span>
          <span>
            Deadline: {new Date(item.dueDate).toLocaleDateString('id-ID')}
            {isOpen && typeof item.daysRemaining === 'number'
              ? item.daysRemaining >= 0
                ? ` (${item.daysRemaining} hari lagi)`
                : ` (${Math.abs(item.daysRemaining)} hari lewat)`
              : ''}
          </span>
          {item.completedAt && <span>Selesai: {new Date(item.completedAt).toLocaleDateString('id-ID')}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ActionItemProgressBar progress={item.progress ?? 0} isOverdue={item.isOverdue} />
        {onUpdateProgress && isOpen && (
          <div className="flex items-center gap-1">
            <Label className="sr-only" htmlFor={`progress-${item.id}`}>
              Progress
            </Label>
            <Input
              id={`progress-${item.id}`}
              type="number"
              min={0}
              max={100}
              className="h-8 w-16"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitProgress}
              onKeyDown={(e) => e.key === 'Enter' && commitProgress()}
            />
          </div>
        )}
        {onUpdateStatus && isOpen && (
          <>
            {item.status === 'PENDING' && (
              <Button size="sm" variant="ghost" title="Mulai kerjakan" onClick={() => onUpdateStatus(item.id, 'IN_PROGRESS')}>
                <Clock className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" title="Tandai selesai" onClick={() => onUpdateStatus(item.id, 'COMPLETED')}>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" title="Batalkan" onClick={() => onUpdateStatus(item.id, 'CANCELLED')}>
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
        {canManage && onDelete && (
          <Button size="sm" variant="ghost" title="Hapus" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** QW-03: summary cards (total / completed / in progress / overdue / avg progress). */
export function ActionItemSummaryCards({
  summary,
}: {
  summary?: {
    total: number;
    byStatus: Record<ActionItemStatus, number>;
    overdue: number;
    completionRate: number;
    averageProgress: number;
  };
}) {
  const cards = [
    { label: 'Total Action Item', value: summary?.total ?? 0, tone: '' },
    { label: 'Selesai', value: summary?.byStatus?.COMPLETED ?? 0, tone: 'text-green-600' },
    { label: 'Berjalan', value: summary?.byStatus?.IN_PROGRESS ?? 0, tone: 'text-amber-600' },
    { label: 'Terlambat', value: summary?.overdue ?? 0, tone: 'text-destructive' },
    { label: 'Rata-rata Progress', value: `${summary?.averageProgress ?? 0}%`, tone: '' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold tabular-nums ${c.tone}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** QW-03: shared list wrapper (loading / empty state + rows). */
export function SurveyActionItemsList({
  items,
  canManage,
  loading,
  onUpdateStatus,
  onUpdateProgress,
  onDelete,
}: {
  items?: SurveyActionItem[];
  canManage?: boolean;
  loading?: boolean;
  onUpdateStatus?: (id: string, status: ActionItemStatus) => void;
  onUpdateProgress?: (id: string, progress: number) => void;
  onDelete?: (id: string) => void;
}) {
  if (loading) return <EmptyState description="Memuat action items…" />;
  if (!items?.length) {
    return <EmptyState description="Belum ada action item untuk ditampilkan." />;
  }

  return (
    <div>
      {items.map((item) => (
        <ActionItemRow
          key={item.id}
          item={item}
          canManage={canManage}
          onUpdateStatus={onUpdateStatus}
          onUpdateProgress={onUpdateProgress}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
