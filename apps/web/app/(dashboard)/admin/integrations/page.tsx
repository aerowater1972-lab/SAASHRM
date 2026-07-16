'use client';

import { useState } from 'react';
import { useIntegrations } from '@/lib/hooks/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Plug } from 'lucide-react';

const typeVariant: Record<string, 'secondary' | 'outline' | 'default'> = {
  BANK: 'default',
  BPJS: 'outline',
  BIOMETRIC: 'secondary',
  PAYMENT_GATEWAY: 'default',
  EMAIL: 'outline',
};

export default function IntegrationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: integrations = [], isLoading, error, refetch } = useIntegrations();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">Hubungkan dengan layanan eksternal</p>
        </div>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && integrations.length === 0 && (
        <EmptyState title="Belum ada integrasi" description="Tambahkan integrasi untuk menghubungkan dengan layanan eksternal." />
      )}

      {!isLoading && !error && integrations.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Sinkronisasi Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {integrations.map((i: any) => (
                    <tr key={i.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Plug className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{i.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(typeVariant[i.type] || 'secondary') as any}>{i.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={i.status === 'ACTIVE' ? 'success' : 'secondary'}>{i.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleString('id-ID') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
