import { z } from 'zod';

export const salaryComponentSchema = z.object({
  employeeId: z.string().min(1, 'Karyawan wajib dipilih'),
  componentType: z.enum(['basic_salary', 'allowance', 'deduction'], { error: 'Tipe komponen wajib dipilih' }),
  amount: z.number().min(0, 'Jumlah wajib diisi'),
  effectiveDate: z.string().min(1, 'Tanggal efektif wajib diisi'),
});
export type SalaryComponentInput = z.infer<typeof salaryComponentSchema>;

export const payrollComponentSchema = z.object({
  name: z.string().min(1, 'Nama komponen wajib diisi'),
  type: z.enum(['EARNING', 'DEDUCTION'], { error: 'Tipe wajib dipilih' }),
  calculationMethod: z.enum(['FIXED', 'PERCENTAGE'], { error: 'Metode perhitungan wajib dipilih' }),
  value: z.number().min(0, 'Nilai wajib diisi'),
  isActive: z.boolean(),
  description: z.string().optional(),
});
export type PayrollComponentInput = z.infer<typeof payrollComponentSchema>;

export const taxSchema = z.object({
  name: z.string().min(1, 'Nama konfigurasi wajib diisi'),
  rate: z.number().min(0, 'Tarif wajib diisi'),
  minIncome: z.number().optional(),
  maxIncome: z.number().optional(),
  isActive: z.boolean(),
});
export type TaxInput = z.infer<typeof taxSchema>;

export const bpjsSchema = z.object({
  name: z.string().min(1, 'Nama konfigurasi wajib diisi'),
  type: z.enum(['KES', 'TENAGA_KERJA', 'PENSIUN'], { error: 'Tipe wajib dipilih' }),
  employeeRate: z.number().min(0, 'Tarif karyawan wajib diisi'),
  employerRate: z.number().min(0, 'Tarif perusahaan wajib diisi'),
  maxWage: z.number().optional(),
  isActive: z.boolean(),
});
export type BpjsInput = z.infer<typeof bpjsSchema>;
