'use client';

import { useState } from 'react';
import { useFeatureFlags, useToggleFeatureFlag } from '@/lib/hooks/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Flag } from 'lucide-react';

export default function FeatureFlagsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [module, setModule] = useState('');
  const [feature, setFeature] = useState('');
  const [enabled, setEnabled] = useState(false);

  const { data: flags = [], isLoading, error, refetch } = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDialogOpen(false);
    setModule('');
    setFeature('');
    setEnabled(false);
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">Aktifkan/nonaktifkan fitur secara dinamis</p>
        </div>
      </div>

      {isLoading && <TableSkeleton rows={5} columns={3} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && flags.length === 0 && (
        <EmptyState title="Belum ada feature flag" description="Feature flag digunakan untuk mengontrol ketersediaan fitur." />
      )}

      {!isLoading && !error && flags.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {flags.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{f.feature}</span>
                        <Badge variant="secondary" className="text-[10px]">{f.module}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.enabled ? 'success' : 'secondary'}>{f.enabled ? 'ON' : 'OFF'}</Badge>
                    <Switch
                      checked={f.enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: f.id, enabled: checked })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
