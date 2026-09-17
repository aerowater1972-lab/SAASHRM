'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEmployee, useUpdateEmployee } from '@/lib/hooks/employees';
import { createEmployeeSchema, type CreateEmployeeInput } from '@/lib/schemas/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageSkeleton, ErrorState } from '@/components/ui/data-states';
import { ArrowLeft, ArrowRight, Check, User, Briefcase, FileText, Heart, MapPin } from 'lucide-react';

const steps = [
  { id: 'personal', label: 'Data Pribadi', icon: User },
  { id: 'contact', label: 'Kontak & Alamat', icon: MapPin },
  { id: 'identity', label: 'Identitas', icon: FileText },
  { id: 'medical', label: 'Data Medis', icon: Heart },
  { id: 'employment', label: 'Kepegawaian', icon: Briefcase },
];

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: employee, isLoading, error, refetch } = useEmployee(id);
  const updateMutation = useUpdateEmployee(id);

  const [step, setStep] = useState(0);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      birthPlace: '',
      gender: undefined,
      religion: '',
      maritalStatus: undefined,
      unionStatus: undefined,
      ptkpCategory: undefined,
      idCardNumber: '',
      taxIdNumber: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      emergencyContact: '',
      emergencyPhone: '',
      startDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        fullName: employee.fullName ?? '',
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        birthDate: employee.birthDate ? employee.birthDate.slice(0, 10) : '',
        birthPlace: employee.birthPlace ?? '',
        gender: (employee.gender as CreateEmployeeInput['gender']) ?? undefined,
        religion: employee.religion ?? '',
        maritalStatus: (employee.maritalStatus as CreateEmployeeInput['maritalStatus']) ?? undefined,
        unionStatus: (employee.unionStatus as CreateEmployeeInput['unionStatus']) ?? undefined,
        ptkpCategory: (employee.ptkpCategory as CreateEmployeeInput['ptkpCategory']) ?? undefined,
        idCardNumber: employee.idCardNumber ?? '',
        taxIdNumber: employee.taxIdNumber ?? '',
        address: employee.address ?? '',
        city: employee.city ?? '',
        province: employee.province ?? '',
        postalCode: employee.postalCode ?? '',
        emergencyContact: employee.emergencyContact ?? '',
        emergencyPhone: employee.emergencyPhone ?? '',
        startDate: employee.startDate ? employee.startDate.slice(0, 10) : '',
        notes: employee.notes ?? '',
      });
    }
  }, [employee, form]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, trigger } = form;

  const stepFields: Record<number, (keyof CreateEmployeeInput)[]> = {
    0: ['fullName', 'email', 'birthDate', 'birthPlace', 'gender', 'religion', 'maritalStatus', 'unionStatus', 'ptkpCategory'],
    1: ['phone', 'address', 'city', 'province', 'postalCode', 'emergencyContact', 'emergencyPhone'],
    2: ['idCardNumber', 'taxIdNumber'],
    3: ['bloodType', 'allergies', 'medicalNotes'],
    4: ['employeeId', 'startDate', 'notes'],
  };

  async function onNext() {
    const fields = stepFields[step];
    const valid = await trigger(fields);
    if (valid) setStep(Math.min(step + 1, steps.length - 1));
  }

  async function onSubmit(data: CreateEmployeeInput) {
    updateMutation.mutate(data as any, {
      onSuccess: () => router.push(`/employees/${id}`),
    });
  }

  if (isLoading) return <PageSkeleton />;

  if (error || !employee) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Karyawan tidak ditemukan'}
        onRetry={() => refetch()}
      />
    );
  }

  const currentStep = steps[step];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Karyawan</h1>
        <p className="text-sm text-muted-foreground">
          Perbarui data {employee.fullName}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <currentStep.icon className="h-5 w-5 text-primary" />
            {currentStep.label}
          </CardTitle>
          <CardDescription>
            {step === 0 && 'Nama lengkap, email, dan data demografis dasar'}
            {step === 1 && 'Nomor telepon dan alamat tinggal'}
            {step === 2 && 'Nomor KTP, NPWP, dan BPJS'}
            {step === 3 && 'Golongan darah, alergi, dan catatan medis'}
            {step === 4 && 'ID karyawan, tanggal mulai, dan catatan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap *</Label>
                <Input id="fullName" {...register('fullName')} placeholder="Budi Santoso" />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register('email')} placeholder="budi@company.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Tanggal Lahir</Label>
                <Input id="birthDate" type="date" {...register('birthDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthPlace">Tempat Lahir</Label>
                <Input id="birthPlace" {...register('birthPlace')} placeholder="Jakarta" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <select
                  id="gender"
                  {...register('gender')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="religion">Agama</Label>
                <Input id="religion" {...register('religion')} placeholder="Islam" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Status Pernikahan</Label>
                <select
                  id="maritalStatus"
                  {...register('maritalStatus')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="SINGLE">Lajang</option>
                  <option value="MARRIED">Menikah</option>
                  <option value="DIVORCED">Cerai</option>
                  <option value="WIDOWED">Duda/Janda</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unionStatus">Status Serikat Pekerja</Label>
                <select
                  id="unionStatus"
                  {...register('unionStatus')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="NONE">Bukan Anggota</option>
                  <option value="MEMBER">Anggota</option>
                  <option value="OFFICER">Pengurus</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ptkpCategory">Kategori PTKP (PPh 21)</Label>
                <select
                  id="ptkpCategory"
                  {...register('ptkpCategory')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="TK/0">TK/0</option>
                  <option value="TK/1">TK/1</option>
                  <option value="TK/2">TK/2</option>
                  <option value="TK/3">TK/3</option>
                  <option value="K/0">K/0</option>
                  <option value="K/1">K/1</option>
                  <option value="K/2">K/2</option>
                  <option value="K/3">K/3</option>
                </select>
                <p className="text-[11px] text-muted-foreground">Wajib ditinjau HR — menentukan tarif TER & PTKP.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" {...register('phone')} placeholder="0812-3456-7890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Kontak Darurat</Label>
                <Input id="emergencyContact" {...register('emergencyContact')} placeholder="Nama kontak darurat" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Telepon Darurat</Label>
                <Input id="emergencyPhone" {...register('emergencyPhone')} placeholder="Nomor telepon darurat" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Alamat</Label>
                <textarea
                  id="address"
                  {...register('address')}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Jl. Contoh No. 123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Kota</Label>
                <Input id="city" {...register('city')} placeholder="Jakarta" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provinsi</Label>
                <Input id="province" {...register('province')} placeholder="DKI Jakarta" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Kode Pos</Label>
                <Input id="postalCode" {...register('postalCode')} placeholder="12345" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idCardNumber">Nomor KTP</Label>
                <Input id="idCardNumber" {...register('idCardNumber')} placeholder="16 digit NIK" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxIdNumber">NPWP</Label>
                <Input id="taxIdNumber" {...register('taxIdNumber')} placeholder="XX.XXX.XXX.X-XXX.XXX" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodType">Golongan Darah</Label>
                <select
                  id="bloodType"
                  {...register('bloodType')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergi</Label>
                <Input id="allergies" {...register('allergies')} placeholder="Tidak ada" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="medicalNotes">Catatan Medis</Label>
                <textarea
                  id="medicalNotes"
                  {...register('medicalNotes')}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Catatan medis jika ada"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">ID Karyawan</Label>
                <Input id="employeeId" {...register('employeeId')} placeholder="EMP-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Catatan</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Catatan tambahan"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {updateMutation.isError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {updateMutation.error instanceof Error ? updateMutation.error.message : 'Gagal menyimpan data'}
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => step > 0 ? setStep(step - 1) : router.push(`/employees/${id}`)}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? 'Batal' : 'Sebelumnya'}
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Langkah {step + 1} dari {steps.length}
        </div>

        {step < steps.length - 1 ? (
          <Button onClick={onNext}>
            Selanjutnya
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
        )}
      </div>
    </div>
  );
}
