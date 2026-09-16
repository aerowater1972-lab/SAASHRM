'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTeamCalendar } from '@/lib/hooks/leave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { ArrowLeft, ChevronLeft, ChevronRight, Palmtree } from 'lucide-react';

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TeamCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const { data, isLoading, error, refetch } = useTeamCalendar(toISODate(monthStart), toISODate(monthEnd));

  const cells = useMemo(() => {
    const daysInMonth = monthEnd.getDate();
    // Senin = kolom pertama (0=Min -> geser 6)
    const leadBlanks = (monthStart.getDay() + 6) % 7;
    const arr: Array<{ date: Date } | null> = Array.from({ length: leadBlanks }, () => null);
    for (let d = 1; d <= daysInMonth; d++) arr.push({ date: new Date(year, month, d) });
    return arr;
  }, [year, month]);

  const leaves: any[] = (data as any)?.leaves ?? [];
  const holidays: any[] = (data as any)?.holidays ?? [];
  const holidayByDate = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach((h: any) => map.set(toISODate(new Date(h.date)), h.name));
    return map;
  }, [holidays]);

  function leavesOn(date: Date): any[] {
    const t = new Date(date); t.setHours(0, 0, 0, 0);
    return leaves.filter((l: any) => {
      const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(l.endDate); e.setHours(23, 59, 59, 999);
      return t >= s && t <= e;
    });
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Gagal memuat kalender'} onRetry={() => refetch()} />;

  const monthLabel = monthStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/leaves"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kalender Tim</h1>
          <p className="text-sm text-muted-foreground">Cuti disetujui se-tim berdampingan dengan hari libur</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium capitalize w-36 text-center">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palmtree className="h-4 w-4 text-primary" />
            {monthLabel}
            <span className="ml-auto flex gap-2 text-xs font-normal">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Cuti</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Libur</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
            {DAY_NAMES.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`b-${i}`} className="min-h-20 rounded-md bg-muted/30" />;
              const iso = toISODate(cell.date);
              const holiday = holidayByDate.get(iso);
              const dayLeaves = leavesOn(cell.date);
              const isToday = iso === toISODate(today);
              return (
                <div key={iso} className={`min-h-20 rounded-md border p-1 text-left ${isToday ? 'border-primary' : ''} ${holiday ? 'bg-amber-500/10' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>{cell.date.getDate()}</span>
                    {holiday && <Badge variant="secondary" className="text-[9px] px-1 py-0 max-w-16 truncate" title={holiday}>{holiday}</Badge>}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayLeaves.slice(0, 3).map((l: any) => (
                      <Link key={l.id} href={`/leaves/${l.id}`}>
                        <div className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary hover:bg-primary/20" title={`${l.employee?.fullName} — ${l.leaveType?.name}`}>
                          {l.employee?.fullName?.split(' ')[0]} · {l.leaveType?.code}
                        </div>
                      </Link>
                    ))}
                    {dayLeaves.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayLeaves.length - 3} lainnya</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {leaves.length === 0 && holidays.length === 0 && (
            <EmptyState title="Bulan kosong" description="Tidak ada cuti atau libur pada bulan ini" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
