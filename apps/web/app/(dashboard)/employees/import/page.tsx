'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { parseCSV, csvToCreateEmployeeDto } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

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
    setLoading(true); setError('');
    try {
      const data = preview.map(csvToCreateEmployeeDto);
      const res = await api.post<{ imported: number; errors: string[] }>('/employees/bulk-import', data);
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Karyawan</h1>
        <p className="text-sm text-muted-foreground">
          Upload file CSV dengan kolom: <code className="text-xs bg-muted px-1 rounded">employeeId</code>, <code className="text-xs bg-muted px-1 rounded">fullName</code>, <code className="text-xs bg-muted px-1 rounded">email</code>
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Upload CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />

          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          {preview.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {preview.length} baris ditemukan
              </p>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        {headers.map(h => (
                          <TableCell key={h} className="max-w-[200px] truncate">{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 10 && (
                  <p className="text-xs text-muted-foreground px-4 py-2">...dan {preview.length - 10} baris lagi</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? 'Mengimpor…' : `Import ${preview.length} Karyawan`}
                </Button>
                <Button variant="outline" onClick={() => router.push('/employees')}>
                  Batal
                </Button>
              </div>
            </>
          )}

          {result && (
            <div className="rounded-md border p-4 space-y-2">
              <p className="font-semibold text-sm text-foreground">Import Selesai</p>
              <p className="text-sm text-muted-foreground">{result.imported} karyawan berhasil diimport.</p>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm text-destructive">{result.errors.length} error:</p>
                  <ul className="pl-5 text-sm text-muted-foreground list-disc">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push('/employees')}>
                Kembali ke Karyawan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
