import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Nama role wajib diisi'),
  description: z.string().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Nama tenant wajib diisi'),
  domain: z.string().optional(),
  package: z.enum(['STANDARD', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const createWorkflowSchema = z.object({
  code: z.string().min(1, 'Kode workflow wajib diisi'),
  name: z.string().min(1, 'Nama workflow wajib diisi'),
  description: z.string().optional(),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const assignPermissionSchema = z.object({
  roleId: z.string(),
  permissionKeys: z.array(z.string()),
  scope: z.enum(['ALL', 'OWN', 'DEPARTMENT']).optional(),
});
export type AssignPermissionInput = z.infer<typeof assignPermissionSchema>;

export const createUserSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
