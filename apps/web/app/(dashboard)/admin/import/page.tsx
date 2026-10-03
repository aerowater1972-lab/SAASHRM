'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { parseCSV, csvToCreateEmployeeDto } from '@/lib/csv';
import { useBulkImport } from '@/lib/hooks/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/data-states';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';

const ImportSchema = z.object({
  columnMapping: z.record(z.string(), z.string()).optional(),
});
type ImportFormData = z.infer<typeof ImportSchema>;

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[]; errors: string[] } | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<any>(null);

  const { mutate: bulkImport, isPending } = useBulkImport();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsed(null);
    setPreviewRows([]);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text, ['email', 'fullName']);
      setParsed(result);
      if (result.rows.length > 0) {
        setPreviewRows(result.rows.slice(0, 10));
      }
    };
    reader.readAsText(f);
  }, []);

  function handleMap(h: string, value: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (value) {
        next[h] = value;
      } else {
        delete next[h];
      }
      return next;
    });
  }

  function handleImport() {
    if (!parsed) return;
    const mappedRows = parsed.rows.map((row) => {
      const dto: Record<string, string> = {};
      for (const [csvHeader, dtoField] of Object.entries(mapping)) {
        if (row[csvHeader] !== undefined) {
          dto[dtoField] = row[csvHeader];
        }
      }
      return dto;
    });
    bulkImport(
      { rows: mappedRows },
      {
        onSuccess: (res) => {
          setImportResult(res);
        },
      },
    );
  }

  const requiredFields = ['email', 'fullName'];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import CSV</h1>
        <p className="text-sm text-muted-foreground">Import data karyawan dari file CSV</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload File</CardTitle></CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('csv-upload')?.click()}
          >
            <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {file ? file.name : 'Klik atau seret file CSV di sini'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Format: CSV dengan header (max 500 baris)</p>
          </div>
        </CardContent>
      </Card>

      {parsed && parsed.errors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><XCircle className="h-4 w-4" /> CSV Parse Errors</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {parsed.errors.map((err, i) => <li key={i} className="text-destructive">{err}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {parsed && parsed.headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapping Kolom</CardTitle>
            <p className="text-xs text-muted-foreground">Petakan header CSV ke field DTO. Kolom <code className="bg-muted px-1 rounded text-[10px]">email</code> dan <code className="bg-muted px-1 rounded text-[10px]">fullName</code> wajib.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {parsed.headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs min-w-[120px] truncate">{h}</Badge>
                  <span className="text-muted-foreground text-xs">→</span>
                  <select
                    value={mapping[h] ?? ''}
                    onChange={(e) => handleMap(h, e.target.value)}
                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Abaikan</option>
                    <option value="email">email</option>
                    <option value="fullName">fullName</option>
                    <option value="phone">phone</option>
                    <option value="employeeId">employeeId</option>
                    <option value="birthDate">birthDate</option>
                    <option value="birthPlace">birthPlace</option>
                    <option value="gender">gender</option>
                    <option value="religion">religion</option>
                    <option value="maritalStatus">maritalStatus</option>
                    <option value="idCardNumber">idCardNumber</option>
                    <option value="taxIdNumber">taxIdNumber</option>
                    <option value="address">address</option>
                    <option value="city">city</option>
                    <option value="province">province</option>
                    <option value="postalCode">postalCode</option>
                    <option value="startDate">startDate</option>
                    <option value="status">status</option>
                    <option value="notes">notes</option>
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {parsed && previewRows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Preview ({previewRows.length} dari {parsed.rows.length} baris)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    {Object.keys(previewRows[0]).map((k) => (
                      <th key={k} className="px-3 py-2 text-left">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      {Object.values(r).map((v, j) => (
                        <td key={j} className="px-3 py-1.5 text-foreground">{v || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {parsed && parsed.rows.length > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={handleImport} disabled={isPending || Object.keys(mapping).length === 0}>
            {isPending ? 'Mengimpor…' : 'Import Sekarang'}
          </Button>
          {Object.keys(mapping).length === 0 && (
            <p className="text-xs text-muted-foreground">Petakan minimal kolom yang diperlukan sebelum import.</p>
          )}
        </div>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Hasil Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{importResult.total}</p>
                <p className="text-xs text-muted-foreground">Total Baris</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
                <p className="text-xs text-green-600">Berhasil</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
                <p className="text-xs text-red-600">Gagal</p>
              </div>
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {importResult.errors.map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 p-2 rounded">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>Baris {e.row}: {e.field} — {e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}