'use client';

import Link from 'next/link';
import { useProvincialWages } from '@/lib/hooks/use-wage';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

export default function WagePage() {
  const { data: wages, isLoading } = useProvincialWages();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">UMK/UMP Provincial Wage</h1>
          <p className="text-sm text-muted-foreground">Manage regional minimum wage data</p>
        </div>
        <Button asChild>
          <Link href="/wage/new">
            <Plus className="mr-2 h-4 w-4" /> New Entry
          </Link>
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search province…" className="pl-8" />
      </div>

      {isLoading && <div className="text-muted-foreground py-8 text-center">Loading…</div>}

      {!isLoading && wages && wages.length === 0 && (
        <div className="text-center text-muted-foreground py-8">No wage entries found</div>
      )}

      {!isLoading && wages && wages.length > 0 && (
        <Card>
          <div className="grid grid-cols-3 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
            <span>Province</span>
            <span>Year</span>
            <span>Amount (IDR)</span>
          </div>
          {wages.map((wage) => (
            <div key={wage.id} className="grid grid-cols-3 gap-4 p-4 text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0">
              <span><Badge variant="secondary">{wage.province}</Badge></span>
              <span className="text-muted-foreground">{wage.year}</span>
              <span>{wage.amount.toLocaleString('id-ID')}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}