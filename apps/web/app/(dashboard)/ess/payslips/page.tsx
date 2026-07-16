'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useEssPayslips,
  useEssPayslip,
  useAcknowledgeEssPayslip,
} from '@/lib/hooks/ess';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import { ChevronLeft, Clock, CalendarDays, Wallet, User, Bell, Receipt } from 'lucide-react';

interface EssPayslipSummary {
  id: string;
  period?: string;
  month?: string;
  status?: string;
  acknowledged?: boolean;
  netPay?: number;
}

interface EssPayslipDetail {
  id: string;
  period?: string;
  grossPay?: number;
  totalDeductions?: number;
  bpjsTotal?: number;
  taxTotal?: number;
  netPay?: number;
  status?: string;
  acknowledged?: boolean;
}

function formatRupiah(value?: number): string {
  if (value == null || Number.isNaN(value)) return 'Rp 0';
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function statusBadge(status?: string): { label: string; variant: 'success' | 'warning' | 'info' | 'outline' | 'secondary' } {
  switch ((status ?? '').toUpperCase()) {
    case 'PAID':
      return { label: 'Dibayar', variant: 'success' };
    case 'PROCESSED':
      return { label: 'Diproses', variant: 'info' };
    case 'DRAFT':
      return { label: 'Draft', variant: 'warning' };
    default:
      return { label: status || 'Tidak Diketahui', variant: 'outline' };
  }
}

function getPayslipList(raw: unknown): EssPayslipSummary[] {
  if (Array.isArray(raw)) return raw as EssPayslipSummary[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)) {
    return (raw as Record<string, unknown>).data as EssPayslipSummary[];
  }
  return [];
}

export default function EssPayslipsPage() {
  const { data, isLoading, error, refetch } = useEssPayslips();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const payslips = getPayslipList(data);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-md pb-20">
      {/* Header */}
      <Card className="flex items-center gap-2 rounded-none border-x-0 border-t-0 p-4 shadow-none">
        <Link href="/ess" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Slip Gaji</h1>
      </Card>

      {/* List */}
      <div className="px-4 py-4">
        {payslips.length === 0 ? (
          <EmptyState title="Belum ada slip gaji" description="Slip gaji Anda akan muncul di sini setelah diproses." />
        ) : (
          <div className="space-y-3">
            {payslips.map((p) => {
              const badge = statusBadge(p.status);
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.period || p.month || '—'}</p>
                      <p className="mt-1 text-lg font-bold">{formatRupiah(p.netPay)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {!p.acknowledged && (
                          <Badge variant="warning">Belum Dibaca</Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(p.id)}>
                      Lihat
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <PayslipDetailDialog
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background">
        <div className="flex justify-around py-2">
          {[
            { href: '/ess', label: 'Home', icon: Clock, active: false },
            { href: '/ess/leave', label: 'Cuti', icon: CalendarDays, active: false },
            { href: '/ess/expense', label: 'Klaim', icon: Wallet, active: false },
            { href: '/ess/profile', label: 'Profil', icon: User, active: false },
            { href: '/ess/notifications', label: 'Notif', icon: Bell, active: false },
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

function PayslipDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading, error, refetch } = useEssPayslip(id ?? '');
  const ackMut = useAcknowledgeEssPayslip();

  const detail = data as EssPayslipDetail | undefined;
  const badge = statusBadge(detail?.status);

  return (
    <Dialog open={!!id} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Detail Slip Gaji
          </DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

        {!isLoading && error && (
          <div className="py-4">
            <ErrorState message="Gagal memuat detail slip gaji." onRetry={() => refetch()} />
          </div>
        )}

        {!isLoading && detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Periode</p>
                <p className="text-base font-semibold">{detail.period || '—'}</p>
              </div>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>

            <div className="space-y-2 rounded-xl border p-3">
              <Row label="Pendapatan Kotor" value={formatRupiah(detail.grossPay)} />
              <Row label="Potongan" value={formatRupiah(detail.totalDeductions)} />
              <Row label="BPJS" value={formatRupiah(detail.bpjsTotal)} />
              <Row label="PPh21" value={formatRupiah(detail.taxTotal)} />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3">
              <span className="text-sm font-medium">Pendapatan Bersih</span>
              <span className="text-lg font-bold">{formatRupiah(detail.netPay)}</span>
            </div>

            {!detail.acknowledged && (
              <Button
                className="w-full"
                disabled={ackMut.isPending}
                onClick={async () => {
                  if (!id) return;
                  await ackMut.mutateAsync(id);
                }}
              >
                {ackMut.isPending ? 'Memproses...' : 'Tandai Dibaca'}
              </Button>
            )}

            <Button variant="outline" className="w-full" onClick={onClose}>
              Tutup
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
