import { z } from 'zod';

export const createDepartmentSchema = z.object({
  organizationId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  name: z.string().min(1, 'Nama departemen wajib diisi'),
  code: z.string().min(1, 'Kode departemen wajib diisi'),
  headEmployeeId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  level: z.number().int().optional(),
  effectiveDate: z.string().optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const createPositionSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1, 'Nama posisi wajib diisi'),
  code: z.string().min(1, 'Kode posisi wajib diisi'),
  gradeId: z.string().uuid().optional(),
  description: z.string().optional(),
  isHead: z.boolean().optional(),
  maxHeadCount: z.number().int().optional(),
});
export type CreatePositionInput = z.infer<typeof createPositionSchema>;

export const createGradeSchema = z.object({
  name: z.string().min(1, 'Nama grade wajib diisi'),
  code: z.string().min(1, 'Kode grade wajib diisi'),
  level: z.number().int().min(1, 'Level wajib diisi'),
  description: z.string().optional(),
});
export type CreateGradeInput = z.infer<typeof createGradeSchema>;
