'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEligibilityRules, useCreateEligibilityRule, useDeleteEligibilityRule, useBenefits } from '@/lib/hooks/benefits';
import { useDepartments, useGrades } from '@/lib/hooks/organization';
import { eligibilityRuleSchema, type EligibilityRuleInput } from '@/lib/schemas/benefits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton, EmptyState, ErrorState } from '@/components/ui/data-states';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface Rule { id: string; benefitId: string; gradeId: string | null; departmentId: string | null; benefit?: { name: string }; grade?: { name: string }; department?: { name: string }; createdAt: string }

export default function EligibilityRulesPage() {
  const { data: rules = [], isLoading, error: queryError, refetch } = useEligibilityRules();
  const createRule = useCreateEligibilityRule();
  const deleteRule = useDeleteEligibilityRule();
  const { rows: benefits = [] } = useBenefits();
  const { data: departments = [] } = useDepartments();
  const { data: grades = [] } = useGrades();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const errMsg = (queryError instanceof Error ? queryError.message : '') || actionError;

  const form = useForm<EligibilityRuleInput>({
    resolver: zodResolver(eligibilityRuleSchema),
    defaultValues: { benefitId: '', gradeId: '', departmentId: '' },
  });

  async function onSubmit(data: EligibilityRuleInput) {
    setActionError('');
    createRule.mutate(data, {
      onSuccess: () => { setDialogOpen(false); form.reset(); },
      onError: (e: any) => setActionError(e.message),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus rule ini?')) return;
    deleteRule.mutate(id, { onError: (e: any) => setActionError(e.message) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eligibility Rules</h1>
          <p className="text-sm text-muted-foreground">Aturan kelayakan benefit berdasarkan grade/departemen</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) form.reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Eligibility Rule</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Benefit</Label>
                <Controller
                  control={form.control}
                  name="benefitId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih benefit" /></SelectTrigger>
                      <SelectContent>
                        {benefits.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.benefitId && <p className="text-xs text-destructive">{form.formState.errors.benefitId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Grade (opsional)</Label>
                <Controller
                  control={form.control}
                  name="gradeId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Semua grade" /></SelectTrigger>
                      <SelectContent>
                        {grades.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Department (opsional)</Label>
                <Controller
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Semua department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button type="submit">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {errMsg && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errMsg}</div>}

      {isLoading && <TableSkeleton rows={5} columns={4} />}
      {queryError && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !queryError && rules.length === 0 && (
        <EmptyState title="Belum ada eligibility rules" description="Tambah aturan kelayakan benefit untuk memulai." />
      )}

      {!isLoading && !queryError && rules.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.benefit?.name || r.benefitId}</TableCell>
                  <TableCell><Badge variant="outline">{r.grade?.name || 'Any'}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r.department?.name || 'Any'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
