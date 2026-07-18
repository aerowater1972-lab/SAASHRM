import { z } from 'zod';

export const Gender = z.enum(['MALE', 'FEMALE']);
export type Gender = z.infer<typeof Gender>;

export const MaritalStatus = z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']);
export type MaritalStatus = z.infer<typeof MaritalStatus>;

export const UnionStatus = z.enum(['NONE', 'MEMBER', 'OFFICER']);
export type UnionStatus = z.infer<typeof UnionStatus>;

export const EmployeeStatus = z.enum(['ACTIVE', 'INACTIVE', 'PENDING_ACTIVATION']);
export type EmployeeStatus = z.infer<typeof EmployeeStatus>;

export const createEmployeeSchema = z.object({
  employeeId: z.string().optional(),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional(),
  alternativePhone: z.string().optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  gender: Gender.optional(),
  religion: z.string().optional(),
  maritalStatus: MaritalStatus.optional(),
  unionStatus: UnionStatus.optional(),
  idCardNumber: z.string().optional(),
  taxIdNumber: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  profilePicture: z.string().optional(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const employeeFilterSchema = z.object({
  departmentId: z.string().uuid().optional(),
  status: EmployeeStatus.optional(),
  includePending: z.boolean().optional(),
  gradeId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type EmployeeFilterInput = z.infer<typeof employeeFilterSchema>;

export const createMovementSchema = z.object({
  employeeId: z.string().min(1, 'Karyawan wajib dipilih'),
  type: z.string().min(1, 'Tipe mutasi wajib dipilih'),
  newPositionId: z.string().optional(),
  newDepartmentId: z.string().optional(),
  effectiveDate: z.string().min(1, 'Tanggal efektif wajib diisi'),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
