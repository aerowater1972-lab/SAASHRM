'use client';
import { RequirePermission } from '@/components/require-permission';
import { useState } from 'react';
import Link from 'next/link';
import { useKbSearch } from '@/lib/hooks/helpdesk';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { EmptyState, TableSkeleton } from '@/components/ui/data-states';

export default function KbPage() {
  return <RequirePermission permission="helpdesk:view"><KbInner /></RequirePermission>;
}

function KbInner() {
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useKbSearch(q);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari artikel bantuan…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {q.trim().length < 2 && <EmptyState title="Cari bantuan" description="Ketik minimal 2 huruf." />}
      {q.trim().length >= 2 && isLoading && <TableSkeleton columns={2} />}
      {q.trim().length >= 2 && !isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((a: any) => (
            <Link key={a.id} href={`/helpdesk/kb/${a.id}`}>
              <Card className="hover:border-primary transition-colors"><CardContent className="p-4">
                <p className="font-medium text-primary hover:underline">{a.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.summary || a.content?.slice(0, 160)}</p>
                {a.category && <Badge variant="secondary" className="mt-2">{a.category}</Badge>}
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
