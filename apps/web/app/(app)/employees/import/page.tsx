'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { parseCSV, csvToCreateEmployeeDto } from '@/lib/csv';
import { Button } from '@/components/ui';

export default function BulkImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text, ['employeeId', 'fullName', 'email']);
      if (parsed.errors.length > 0) {
        setError(parsed.errors.join('; '));
        setPreview([]);
        return;
      }
      setHeaders(parsed.headers);
      setPreview(parsed.rows);
    };
    reader.readAsText(f);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const data = preview.map(csvToCreateEmployeeDto);
      const res = await api.post<{ imported: number; errors: string[] }>('/employees/bulk-import', data);
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mt-0">Bulk Import Employees</h2>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Upload a CSV file with columns: <code>employeeId</code>, <code>fullName</code>, <code>email</code>, and optional fields (phone, birthDate, gender, address, etc.)
      </p>

      <div className="mb-4">
        <input type="file" accept=".csv" onChange={handleFile} className="text-xs" />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {preview.length > 0 && (
        <>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Preview: {preview.length} row(s) found
          </p>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  {headers.map(h => <th key={h} className="border-b border-gray-200 px-2 py-1.5 dark:border-gray-700">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row: any, idx: any) => (
                  <tr key={idx}>
                    {headers.map(h => (
                      <td key={h} className="max-w-[200px] truncate whitespace-nowrap border-b border-gray-200 px-2 py-1.5 dark:border-gray-700">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">...and {preview.length - 10} more row(s)</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="md" onClick={handleImport} disabled={loading}>
              {loading ? 'Importing…' : `Import ${preview.length} Employee(s)`}
            </Button>
            <Button variant="secondary" size="md" onClick={() => router.push('/employees')}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="font-semibold text-gray-900 dark:text-gray-100">Import Complete</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{result.imported} employee(s) imported successfully.</p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-red-500">{result.errors.length} error(s):</p>
              <ul className="pl-5 text-xs text-gray-500 dark:text-gray-400">
                {result.errors.map((e: any, i: any) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={() => router.push('/employees')} className="mt-3">
            Back to Employees
          </Button>
        </div>
      )}
    </div>
  );
}
