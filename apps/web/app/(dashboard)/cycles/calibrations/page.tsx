'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCalibrations, useCreateCalibration, useFinalizeCalibration, useCyclesLookup, useEmployeesLookup } from '@/lib/hooks/calibrations';
import { calibrationSchema, type CalibrationInput } from '@/lib/schemas/performance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Scale } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success',
  in_progress: 'warning',
  scheduled: 'secondary',
};

export default function CalibrationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: sessions = [], isLoading, error, refetch } = useCalibrations();
  const { data: cycles = [] } = useCyclesLookup();
  const { data: facilitators = [] } = useEmployeesLookup();
  const createMutation = useCreateCalibration();
  const finalizeMutation = useFinalizeCalibration();

  const form = useForm<CalibrationInput>({ resolver: zodResolver(calibrationSchema) });

  async function onSubmit(data: CalibrationInput) {
    createMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sesi Kalibrasi</h1>
          <p className="text-sm text-muted-foreground">Sesi kalibrasi penilaian kinerja</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Sesi Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Sesi Kalibrasi</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cal-cycle">Siklus Review</Label>
                <Controller
                  control={form.control}
                  name="cycleId"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="cal-cycle">
                        <SelectValue placeholder="Pilih siklus…" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.cycleId && <p className="text-xs text-destructive">{form.formState.errors.cycleId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-facilitator">Fasilitator</Label>
                <Controller
                  control={form.control}
                  name="facilitatorId"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="cal-facilitator">
                        <SelectValue placeholder="Pilih fasilitator…" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilitators.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.facilitatorId && <p className="text-xs text-destructive">{form.formState.errors.facilitatorId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-date">Tanggal Sesi</Label>
                <Input id="cal-date" type="date" {...form.register('sessionDate')} />
                {form.formState.errors.sessionDate && <p className="text-xs text-destructive">{form.formState.errors.sessionDate.message}</p>}
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <TableSkeleton rows={5} columns={6} />}

      {!isLoading && !error && sessions.length === 0 && (
        <EmptyState title="Belum ada sesi kalibrasi" description="Buat sesi pertama untuk memulai kalibrasi." />
      )}

      {!isLoading && !error && sessions.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Siklus</th>
                    <th className="px-4 py-3 font-medium">Fasilitator</th>
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Skor</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{s.cycle?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.facilitator?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(s.sessionDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-xs">{s.finalScores?.length || 0}</td>
                      <td className="px-4 py-3 text-xs">{s.overallRating != null ? s.overallRating.toFixed(2) : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(statusVariant[s.status] || 'secondary') as any}>{s.status.replace('_', ' ').toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {s.status !== 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => finalizeMutation.mutate(s.id, { onSuccess: () => refetch() })}>
                            Finalisasi
                          </Button>
                        )}
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
