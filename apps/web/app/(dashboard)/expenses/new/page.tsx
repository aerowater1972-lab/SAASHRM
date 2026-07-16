'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getToken } from '@/lib/api';
import { useCreateExpenseClaim } from '@/lib/hooks/expense';
import { expenseClaimSchema, type ExpenseClaimInput } from '@/lib/schemas/expense';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const CATEGORIES = ['TRAVEL', 'MEAL', 'ENTERTAINMENT', 'TRANSPORTATION', 'OFFICE_SUPPLIES', 'UTILITIES', 'TRAINING', 'MEDICAL', 'OTHER'];

interface Item { category: string; description: string; amount: number; date: string }

export default function NewExpensePage() {
  const router = useRouter();
  const createClaim = useCreateExpenseClaim();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const form = useForm<ExpenseClaimInput>({
    resolver: zodResolver(expenseClaimSchema),
    defaultValues: { title: '', description: '' },
  });

  const token = getToken();
  const employeeId = token ? (() => { try { return JSON.parse(atob(token.split('.')[1])).employeeId; } catch { return null; } })() : null;

  function addItem() {
    setItems([...items, { category: 'OTHER', description: '', amount: 0, date: new Date().toISOString().slice(0, 10) }]);
  }

  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  const total = items.reduce((s, it) => s + Number(it.amount || 0), 0);

  async function onSubmit(data: ExpenseClaimInput) {
    if (items.length === 0) { setError('Minimal satu item pengeluaran diperlukan'); return; }
    setError('');
    try {
      const claim = await createClaim.mutateAsync({
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        items: items.map((it) => ({ ...it, amount: Number(it.amount) })),
      });
      router.push(`/expenses/${claim.id}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!employeeId) {
    return (
      <div className="space-y-4">
        <Link href="/expenses" className="text-sm text-muted-foreground hover:text-foreground">&larr; Kembali</Link>
        <Card><CardContent className="p-6"><p className="text-muted-foreground">Akun Anda tidak memiliki profil karyawan.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/expenses" className="text-sm text-muted-foreground hover:text-foreground">&larr; Kembali</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Klaim Pengeluaran Baru</h1>
        <p className="text-sm text-muted-foreground">Ajukan klaim pengeluaran baru</p>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Detail Klaim</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input label="Judul" {...form.register('title')} />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <textarea
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register('description')}
              />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Item</span>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Tambah Item</Button>
            </div>

            {items.length === 0 && <p className="text-sm text-muted-foreground">Belum ada item. Klik &quot;+ Tambah Item&quot; untuk menambahkan.</p>}

            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-end flex-wrap">
                <div className="w-[130px]">
                  <Select value={item.category} onValueChange={(v) => updateItem(i, 'category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <input
                  placeholder="Deskripsi" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                  className="flex-1 min-w-[120px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <input
                  type="number" placeholder="Jumlah" value={item.amount || ''} onChange={(e) => updateItem(i, 'amount', Number(e.target.value))}
                  className="w-[120px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <input
                  type="date" value={item.date} onChange={(e) => updateItem(i, 'date', e.target.value)}
                  className="w-[140px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button type="button" onClick={() => removeItem(i)} className="h-10 px-2 text-destructive hover:bg-destructive/10 rounded-md">&times;</button>
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total: Rp {total.toLocaleString('id-ID')}</span>
              <Button type="submit" disabled={createClaim.isPending}>{createClaim.isPending ? 'Menyimpan…' : 'Ajukan'}</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
