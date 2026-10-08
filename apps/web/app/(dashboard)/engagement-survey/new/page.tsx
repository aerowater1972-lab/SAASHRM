'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEngagementSurvey, useCreateEngagementSurvey, useUpdateEngagementSurvey } from '@/lib/hooks/use-engagement-survey';
import { useDepartments, useGrades } from '@/lib/hooks/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, X } from 'lucide-react';

interface Question {
  id?: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  order: number;
}

const emptyQuestion = (order: number): Question => ({
  questionText: '',
  questionType: 'LIKERT_5',
  options: [],
  isRequired: true,
  order,
});

export default function EngagementSurveyFormPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EngagementSurveyFormContent />
    </Suspense>
  );
}

function EngagementSurveyFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const { data: existing, isLoading: loadingExisting } = useEngagementSurvey(editId || '');
  const createMutation = useCreateEngagementSurvey();
  const updateMutation = useUpdateEngagementSurvey(editId || '');

  const { data: departments } = useDepartments();
  const { data: grades } = useGrades();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('PULSE');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion(0)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setType(existing.type);
      setIsAnonymous(existing.isAnonymous);
      if (existing.targetScope) {
        try {
          const scope = typeof existing.targetScope === 'string' ? JSON.parse(existing.targetScope) : existing.targetScope;
          setTargetDepartments(scope.departments || []);
          setTargetGrades(scope.grades || []);
        } catch {}
      }
      setStartDate(existing.startDate?.split('T')[0] || '');
      setEndDate(existing.endDate?.split('T')[0] || '');
      if (existing.questions && existing.questions.length > 0) {
        setQuestions(existing.questions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options ? JSON.parse(q.options) : [],
          isRequired: q.isRequired,
          order: q.order,
        })));
      }
    }
  }, [existing]);

  function addQuestion() {
    setQuestions([...questions, emptyQuestion(questions.length)]);
  }

  function removeQuestion(idx: number) {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, field: keyof Question, value: any) {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  }

  async function handleSave() {
    setError('');
    if (!title.trim()) { setError('Judul survey harus diisi.'); return; }
    if (!startDate || !endDate) { setError('Periode survey harus diisi.'); return; }
    if (questions.some((q) => !q.questionText.trim())) { setError('Semua pertanyaan harus memiliki teks.'); return; }

    setSaving(true);
    try {
      const payload: any = {
        title,
        type,
        isAnonymous,
        targetScope: JSON.stringify({ departments: targetDepartments, grades: targetGrades }),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        questions: questions.map((q) => ({
          ...(q.id ? { id: q.id } : {}),
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options && q.options.length > 0 ? q.options : undefined,
          isRequired: q.isRequired,
          order: q.order,
        })),
      };

      if (editId) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      router.push('/engagement-survey');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (editId && loadingExisting) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">{editId ? 'Edit Survey' : 'Survey Baru'}</h1>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-sm">Informasi Survey</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Judul Survey</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masukkan judul survey" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="PULSE">Pulse</option>
                <option value="ENPS">eNPS</option>
                <option value="CUSTOM">Kustom</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="anonymous" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="anonymous" className="text-sm">Respon anonim</Label>
          </div>

          <div className="space-y-2">
            <Label>Target Scope (FR-02)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Departemen</p>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                  {(departments ?? []).length === 0 && <p className="text-xs text-muted-foreground">Tidak ada data</p>}
                  {(departments ?? []).map((dept: any) => (
                    <label key={dept.id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={targetDepartments.includes(dept.id)}
                        onChange={(e) => setTargetDepartments(e.target.checked ? [...targetDepartments, dept.id] : targetDepartments.filter(d => d !== dept.id))} />
                      {dept.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Grade</p>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                  {(grades ?? []).length === 0 && <p className="text-xs text-muted-foreground">Tidak ada data</p>}
                  {(grades ?? []).map((g: any) => (
                    <label key={g.id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={targetGrades.includes(g.id)}
                        onChange={(e) => setTargetGrades(e.target.checked ? [...targetGrades, g.id] : targetGrades.filter(d => d !== g.id))} />
                      {g.name || g.level}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Kosongkan semua untuk menargetkan seluruh karyawan.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Pertanyaan ({questions.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="mt-2"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Pertanyaan</Label>
                      <Input value={q.questionText} onChange={(e) => updateQuestion(idx, 'questionText', e.target.value)} placeholder="Teks pertanyaan" />
                    </div>
                    <div className="w-40">
                      <Label className="text-xs">Tipe</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={q.questionType} onChange={(e) => updateQuestion(idx, 'questionType', e.target.value)}>
                        <option value="LIKERT_5">Likert 5</option>
                        <option value="LIKERT_7">Likert 7</option>
                        <option value="NPS">NPS 0-10</option>
                        <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                        <option value="SINGLE_CHOICE">Pilihan Tunggal</option>
                        <option value="FREE_TEXT">Teks Bebas</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id={`required-${idx}`} checked={q.isRequired} onChange={(e) => updateQuestion(idx, 'isRequired', e.target.checked)} className="h-4 w-4" />
                      <Label htmlFor={`required-${idx}`} className="text-xs">Wajib</Label>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeQuestion(idx)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {(q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'SINGLE_CHOICE') && (
                    <div>
                      <Label className="text-xs">Opsi (pisahkan dengan koma)</Label>
                      <Input value={(q.options || []).join(', ')} onChange={(e) => updateQuestion(idx, 'options', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="Opsi 1, Opsi 2, Opsi 3" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Batal</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan…' : editId ? 'Simpan Perubahan' : 'Buat Survey'}</Button>
      </div>
    </div>
  );
}
