'use client';

import Link from 'next/link';
import { useIDPs } from '@/lib/hooks/use-idp';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Target, ChevronRight } from 'lucide-react';
import { IDPStatus } from '@/lib/types';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  ACTIVE: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

function statusLabel(s: string) {
  return s.replace('_', ' ');
}

export default function IDPPage() {
  const { data, isLoading, error } = useIDPs();
  const plans = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Individual Development Plans</h1>
          <p className="text-sm text-muted-foreground">Track employee development goals and activities</p>
        </div>
        <Button asChild>
          <Link href="/idp/new">
            <Plus className="mr-2 h-4 w-4" /> New IDP
          </Link>
        </Button>
      </div>

      {isLoading && <div className="text-muted-foreground py-8 text-center">Loading…</div>}
      {error && <div className="text-destructive">Failed to load IDPs.</div>}

      {!isLoading && plans.length === 0 && (
        <div className="text-center text-muted-foreground py-8">No development plans found</div>
      )}

      {!isLoading && plans.length > 0 && (
        <Card>
          <div className="grid grid-cols-4 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
            <span>Title</span>
            <span>Employee</span>
            <span>Target Date</span>
            <span>Status</span>
          </div>
          {plans.map((plan: any) => (
            <Link key={plan.id} href={`/idp/${plan.id}`} className="grid grid-cols-4 gap-4 p-4 text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0">
              <span className="font-medium">{plan.title}</span>
              <span className="text-muted-foreground">{plan.employee?.fullName ?? plan.employeeId}</span>
              <span className="text-muted-foreground">{plan.targetDate ? new Date(plan.targetDate).toLocaleDateString() : '—'}</span>
              <span><Badge variant={(statusVariant[plan.status] as any) || 'secondary'}>{statusLabel(plan.status)}</Badge></span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}