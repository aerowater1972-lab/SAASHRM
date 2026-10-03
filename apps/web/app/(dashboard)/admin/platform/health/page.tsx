'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState, EmptyState } from '@/components/ui/data-states';
import { Activity, Cpu, HardDrive, Clock, Users, Gauge, AlertTriangle } from 'lucide-react';

export default function SystemHealthPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get<any>('/admin/platform/health'),
  });
  const pingMutation = useMutation({
    mutationFn: () => api.post<any>('/admin/platform/health/ping'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-health'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Activity className="h-6 w-6" />System Health</h1>
          <p className="text-sm text-muted-foreground">Monitoring kesehatan sistem & performa tenant</p>
        </div>
        <Button onClick={() => pingMutation.mutate()} disabled={pingMutation.isPending}>
          {pingMutation.isPending ? 'Merekam...' : 'Ambil Snapshot'}
        </Button>
      </div>

      {error && !isLoading && <ErrorState onRetry={() => qc.invalidateQueries({ queryKey: ['system-health'] })} />}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader><CardTitle className="text-sm">&nbsp;</CardTitle></CardHeader><CardContent><div className="h-8 w-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      )}

      {data && !data.status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data.cpuUsage ?? '—'}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.memoryUsedMb ? `${Math.round(data.memoryUsedMb / 1024)}GB` : '—'}</div>
              <p className="text-xs text-muted-foreground">of {data.memoryTotalMb ? `${Math.round(data.memoryTotalMb / 1024)}GB` : '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Disk</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.diskUsedMb ? `${Math.round(data.diskUsedMb / 1024)}GB` : '—'}</div>
              <p className="text-xs text-muted-foreground">of {data.diskTotalMb ? `${Math.round(data.diskTotalMb / 1024)}GB` : '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.uptimeSeconds ? `${Math.floor(data.uptimeSeconds / 3600)}h` : '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data.activeUsers ?? '—'}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">API Latency (p95)</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data.apiLatencyMs ? `${data.apiLatencyMs}ms` : '—'}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data.errorRate ?? '—'}%</div></CardContent>
          </Card>
        </div>
      )}

      {data?.status === 'no_data' && (
        <EmptyState title="Belum ada data" description="Klik 'Ambil Snapshot' untuk merekam data kesehatan sistem pertama." />
      )}
    </div>
  );
}
