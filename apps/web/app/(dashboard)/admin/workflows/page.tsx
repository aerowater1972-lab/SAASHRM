'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflows, useCreateWorkflow } from '@/lib/hooks/admin';
import { createWorkflowSchema, type CreateWorkflowInput } from '@/lib/schemas/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton, ErrorState, EmptyState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Workflow, Clock, UserCheck, Save, CircleDot } from 'lucide-react';

const approverVariant: Record<string, 'info' | 'warning' | 'secondary'> = {
  ROLE: 'info',
  USER: 'warning',
  MANAGER: 'secondary',
};

export default function WorkflowsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const { data: workflows = [], isLoading, error, refetch } = useWorkflows();
  const createMutation = useCreateWorkflow();

  const form = useForm<CreateWorkflowInput>({ resolver: zodResolver(createWorkflowSchema) });

  const active = workflows.find((w: any) => w.id === selectedId) ?? workflows[0];
  const steps = (active?.steps ?? []).slice().sort((a: any, b: any) => a.stepOrder - b.stepOrder);

  async function onSubmit(data: CreateWorkflowInput) {
    createMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); refetch(); },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow Designer</h1>
          <p className="text-sm text-muted-foreground">Definisi alur kerja dan persetujuan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Workflow Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Workflow Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wf-code">Kode Workflow</Label>
                <Input id="wf-code" placeholder="e.g. LEAVE_APPROVAL" {...form.register('code')} />
                {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-name">Nama Workflow</Label>
                <Input id="wf-name" placeholder="e.g. Persetujuan Cuti" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-desc">Deskripsi (opsional)</Label>
                <Input id="wf-desc" placeholder="Deskripsi workflow" {...form.register('description')} />
                {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <TableSkeleton rows={3} columns={3} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !error && workflows.length === 0 && (
        <EmptyState title="Belum ada workflow" description="Buat workflow pertama untuk mendefinisikan alur persetujuan." />
      )}

      {!isLoading && !error && workflows.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <Label htmlFor="wf-select">Pilih Workflow</Label>
            <Select value={active?.id ?? ''} onValueChange={(v) => { setSelectedId(v); setSelectedStep(null); }}>
              <SelectTrigger id="wf-select" className="w-[280px]">
                <SelectValue placeholder="Pilih workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {active && <Badge variant={active.status === 'ACTIVE' ? 'success' : 'secondary'}>v{active.version} · {active.status}</Badge>}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            {/* Canvas / Stepper */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-4">
                  <Workflow className="h-4 w-4" /> Canvas Alur Kerja
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-32 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    Start
                  </div>
                  {steps.length === 0 && <p className="my-4 text-sm text-muted-foreground">Belum ada step.</p>}
                  {steps.map((s: any, i: number) => (
                    <div key={s.id} className="flex w-full flex-col items-center">
                      <div className="my-1 h-8 w-0.5 bg-border" />
                      <button
                        onClick={() => setSelectedStep(i)}
                        className={`flex w-full max-w-sm items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                          selectedStep === i ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                        }`}
                        role="button"
                        aria-label={`Step ${s.stepOrder}: ${s.name}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {s.stepOrder}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge variant={approverVariant[s.approverType] || 'secondary'} className="text-[10px]">
                              <UserCheck className="mr-1 h-3 w-3" />{s.approverType}
                            </Badge>
                            {s.timeoutHours && (
                              <Badge variant="outline" className="text-[10px]">
                                <Clock className="mr-1 h-3 w-3" />{s.timeoutHours}j
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                  {steps.length > 0 && <div className="my-1 h-8 w-0.5 bg-border" />}
                  <div className="flex h-10 w-32 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    End
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Properties panel */}
            <Card className="h-fit">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                  <CircleDot className="h-4 w-4" /> Properties
                </div>
                {selectedStep === null || !steps[selectedStep] ? (
                  <p className="text-sm text-muted-foreground">Pilih sebuah step untuk melihat detail.</p>
                ) : (
                  (() => {
                    const s = steps[selectedStep];
                    return (
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Nama Step</p>
                          <p className="font-medium">{s.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Urutan</p>
                          <p className="font-medium">{s.stepOrder}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tipe Approver</p>
                          <Badge variant={approverVariant[s.approverType] || 'secondary'} className="text-[10px]">{s.approverType}</Badge>
                        </div>
                        {s.approverRoleId && (
                          <div><p className="text-xs text-muted-foreground">Role ID</p><p className="font-mono text-xs break-all">{s.approverRoleId}</p></div>
                        )}
                        {s.approverUserId && (
                          <div><p className="text-xs text-muted-foreground">User ID</p><p className="font-mono text-xs break-all">{s.approverUserId}</p></div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Timeout (jam)</p>
                          <p className="font-medium">{s.timeoutHours ?? '-'}</p>
                        </div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled title="Pengubahan step belum didukung oleh backend">
              <Save className="mr-2 h-4 w-4" />Simpan Alur
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
