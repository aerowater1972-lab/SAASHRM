'use client';

import Link from 'next/link';
import { useFeedback360Sessions } from '@/lib/hooks/use-feedback360';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, MessageSquare, ChevronRight } from 'lucide-react';
import { FeedbackStatus, FeedbackReviewerType } from '@/lib/types';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  ACTIVE: 'warning',
  COMPLETED: 'success',
  REVIEWED: 'success',
  ARCHIVED: 'secondary',
};

function statusLabel(s: string) {
  return s.replace('_', ' ');
}

export default function Feedback360Page() {
  const { data, isLoading, error } = useFeedback360Sessions();
  const sessions = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">360° Feedback</h1>
          <p className="text-sm text-muted-foreground">Manage multi-rater feedback sessions</p>
        </div>
        <Button asChild>
          <Link href="/feedback360/new">
            <Plus className="mr-2 h-4 w-4" /> New Session
          </Link>
        </Button>
      </div>

      {isLoading && <div className="text-muted-foreground py-8 text-center">Loading…</div>}
      {error && <div className="text-destructive">Failed to load sessions.</div>}

      {!isLoading && sessions.length === 0 && (
        <div className="text-center text-muted-foreground py-8">No feedback sessions found</div>
      )}

      {!isLoading && sessions.length > 0 && (
        <Card>
          <div className="grid grid-cols-4 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
            <span>Reviewee</span>
            <span>Type</span>
            <span>Status</span>
            <span>Responses</span>
          </div>
          {sessions.map((session: any) => (
            <Link key={session.id} href={`/feedback360/${session.id}`} className="grid grid-cols-4 gap-4 p-4 text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0">
              <span className="font-medium">{session.reviewee?.fullName ?? session.revieweeId}</span>
              <span className="text-muted-foreground">{session.reviewerType}</span>
              <span> <Badge variant="warning">{statusLabel(session.status)}</Badge></span>
              <span>{session._count?.responses ?? 0} responses</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}