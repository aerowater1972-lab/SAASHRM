'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card } from '@/components/ui';

interface Batch { id: string; payrollRunId: string; bankCode: string; fileUrl: string; status: string; generatedAt: string; run?: { period: string }; }

const STATUS_COLORS: Record<string, string> = { generated: 'text-gray-500', submitted: 'text-yellow-500', confirmed: 'text-green-500', failed: 'text-red-500' };

export default function BankTransferBatchesPage() {
  const { data: batches = [], error } = useQuery({
    queryKey: ['bank-transfers'],
    queryFn: () => api.get<Batch[]>('/payroll/bank-transfers'),
  });

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Bank Transfer Batches</h2>
      {error && <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg text-sm mb-4">{error?.message}</div>}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="pb-2 pr-4">Period</th><th className="pb-2 pr-4">Bank</th><th className="pb-2 pr-4">File</th><th className="pb-2 pr-4">Generated</th><th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-t border-gray-200 dark:border-gray-700 text-sm">
                  <td className="py-2.5 pr-4">{b.run?.period || '—'}</td>
                  <td className="py-2.5 pr-4">{b.bankCode}</td>
                  <td className="py-2.5 pr-4"><a href={b.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Download</a></td>
                  <td className="py-2.5 pr-4">{new Date(b.generatedAt).toLocaleDateString('id-ID')}</td>
                  <td className={`py-2.5 font-semibold ${STATUS_COLORS[b.status] || 'text-gray-500'}`}>{b.status.toUpperCase()}</td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={5} className="py-4 text-sm text-gray-400">No bank transfer batches found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
