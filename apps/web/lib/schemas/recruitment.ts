import { z } from 'zod';

export const candidateSchema = z.object({
  firstName: z.string().min(1, 'Nama depan wajib diisi'),
  lastName: z.string().min(1, 'Nama belakang wajib diisi'),
  email: z.string().min(1, 'Email wajib diisi'),
  phone: z.string().optional(),
  source: z.string().optional(),
  currentCompany: z.string().optional(),
  currentPosition: z.string().optional(),
  notes: z.string().optional(),
});

export type CandidateInput = z.infer<typeof candidateSchema>;

export const jobSchema = z.object({
  title: z.string().min(1, 'Judul pekerjaan wajib diisi'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  positionId: z.string().min(1, 'Position ID wajib diisi'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
  location: z.string().optional(),
  minSalary: z.string().optional(),
  maxSalary: z.string().optional(),
  slots: z.string().min(1, 'Jumlah slot wajib diisi'),
});

export type JobInput = z.infer<typeof jobSchema>;

export const jobRequisitionSchema = z.object({
  title: z.string().min(1, 'Judul posisi wajib diisi'),
  departmentId: z.string().min(1, 'Departemen wajib dipilih'),
  headcount: z.string().min(1, 'Jumlah karyawan wajib diisi'),
  priority: z.enum(['normal', 'urgent']),
});

export type JobRequisitionInput = z.infer<typeof jobRequisitionSchema>;
