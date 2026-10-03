'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '@/lib/api/employees';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value: string;
  onChange: (employeeId: string, label: string) => void;
  label?: string;
}

export function EmployeeSearch({ value, onChange, label = 'Cari Karyawan' }: Props) {
  const [search, setSearch] = useState('');
  const { data } = useQuery({
    queryKey: ['emp-search', search],
    queryFn: () => fetchEmployees({ q: search, limit: 10, includePending: true }),
    enabled: search.length >= 2,
  });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={search} onChange={e => { setSearch(e.target.value); if (value) onChange('', ''); }} placeholder="Nama atau ID karyawan..." />
      {search.length >= 2 && data?.data && (
        <div className="border rounded-md max-h-40 overflow-y-auto">
          {data.data.length === 0 && <p className="p-2 text-sm text-muted-foreground">Tidak ditemukan</p>}
          {data.data.map((emp: any) => (
            <button key={emp.id} type="button"
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${value === emp.id ? 'bg-muted font-medium' : ''}`}
              onClick={() => { onChange(emp.id, `${emp.fullName} (${emp.employeeId})`); setSearch(''); }}
            >{emp.fullName} <span className="text-muted-foreground">{emp.employeeId}</span></button>
          ))}
        </div>
      )}
      {value && !search && <p className="text-xs text-muted-foreground">Dipilih: {value}</p>}
    </div>
  );
}
