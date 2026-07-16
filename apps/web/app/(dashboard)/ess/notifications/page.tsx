'use client';

import { useEssNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/lib/hooks/ess';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import { Clock, CalendarDays, Wallet, User, Bell, CheckCheck, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface EssNotification {
  id: string;
  message?: string;
  title?: string;
  body?: string;
  createdAt?: string;
  created_at?: string;
  read?: boolean;
  isRead?: boolean;
}

function normalizeNotifications(raw: unknown): EssNotification[] {
  if (Array.isArray(raw)) return raw as EssNotification[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as EssNotification[];
    if (Array.isArray(obj.notifications)) return obj.notifications as EssNotification[];
    if (Array.isArray(obj.items)) return obj.items as EssNotification[];
  }
  return [];
}

export default function EssNotificationsPage() {
  const { data: raw, isLoading, error, refetch } = useEssNotifications();
  const markReadMut = useMarkNotificationRead();
  const markAllMut = useMarkAllNotificationsRead();

  const notifications = normalizeNotifications(raw);
  const hasUnread = notifications.some((n) => !n.read && !n.isRead);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-md pb-20">
      {/* Header */}
      <Card className="sticky top-0 z-10 rounded-none border-x-0 border-t-0 p-4 shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/ess" className="flex items-center gap-1 text-muted-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold">Notifikasi</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMut.mutate()}
            disabled={!hasUnread || markAllMut.isPending}
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Tandai Semua Dibaca
          </Button>
        </div>
      </Card>

      {/* List */}
      <div className="px-4 py-4">
        {notifications.length === 0 ? (
          <EmptyState title="Tidak ada notifikasi" description="Belum ada notifikasi yang tersedia untuk Anda." />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const read = !!n.read || !!n.isRead;
              const dateValue = n.createdAt ?? n.created_at;
              return (
                <Card
                  key={n.id}
                  onClick={() => {
                    if (!read) markReadMut.mutate(n.id);
                  }}
                  className={`flex cursor-pointer items-start gap-3 p-4 transition-colors ${read ? '' : 'bg-primary/5'}`}
                >
                  <div className="flex-1">
                    <p className={`text-sm ${read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                      {n.message ?? n.title ?? n.body ?? 'Notifikasi'}
                    </p>
                    {dateValue && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(dateValue).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {!read ? (
                      <Badge variant="destructive" className="text-[10px]">Belum Dibaca</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Dibaca</Badge>
                    )}
                    {!read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Belum dibaca" />}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background">
        <div className="flex justify-around py-2">
          {[
            { href: '/ess', label: 'Home', icon: Clock, active: false },
            { href: '/ess/leave', label: 'Cuti', icon: CalendarDays, active: false },
            { href: '/ess/expense', label: 'Klaim', icon: Wallet, active: false },
            { href: '/ess/profile', label: 'Profil', icon: User, active: false },
            { href: '/ess/notifications', label: 'Notif', icon: Bell, active: true },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1 ${item.active ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
