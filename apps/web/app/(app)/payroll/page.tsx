'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useServerTable } from '@/hooks/use-server-table';
import { api } from '@/lib/api';
import { exportToCSV } from '@/lib/export';
import { Button, Pagination } from '@/components/ui';

interface PayrollPeriod {
  id: string; name: string; status: string;
  startDate: string; endDate: string; createdAt: string;
}

const subPages = [
  { href: '/payroll', label: 'Periods', exact: true },
  { href: '/payroll/components', label: 'Components', exact: false },
  { href: '/payroll/tax', label: 'Tax', exact: false },
  { href: '/payroll/bpjs', label: 'BPJS', exact: false },
];

export default function PayrollPage() {
  const pathname = usePathname();
  const { rows: periods, total, page, setPage, search, setSearch, isLoading, error } =
    useServerTable<any>(['payroll', 'runs'], ({ page, limit, q }) =>
      api.get('/payroll/runs', { params: { page, limit, q } }),
    );

  return (
    <div>
      <h2 className="mt-0">Payroll</h2>

      {/* Sub-nav */}
      <div className="mb-6 flex gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
        {subPages.map((p: any) => (
          <Link key={p.href} href={p.href} className={`text-sm no-underline ${
            p.exact
              ? (pathname === p.href ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400')
              : (pathname.startsWith(p.href) ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-normal text-gray-500 dark:text-gray-400')
          }`}>{p.label}</Link>
        ))}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div></div>
        <Button variant="secondary" size="sm" onClick={() => exportToCSV(
          ['Name', 'Start Date', 'End Date', 'Status'],
          periods.map((p: any) => [p.name, new Date(p.startDate).toLocaleDateString('id-ID'), new Date(p.endDate).toLocaleDateString('id-ID'), p.status]),
          'payroll-periods'
        )}>Export CSV</Button>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error?.message}</div>}
      {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
      {!isLoading && !error && (
        <>
          <input
            type="text" placeholder="Search name, status…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="py-2 font-medium">Name</th><th className="font-medium">Period</th><th className="font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p: any) => (
              <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-2.5"><Link href={`/payroll/${p.id}`}>{p.name}</Link></td>
                <td>{new Date(p.startDate).toLocaleDateString('id-ID')} – {new Date(p.endDate).toLocaleDateString('id-ID')}</td>
                <td>{p.status}</td>
              </tr>
            ))}
            {periods.length === 0 && <tr><td colSpan={3} className="py-2.5 text-gray-500 dark:text-gray-400">No periods.</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
