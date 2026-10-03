import { z } from 'zod';

export const createBenefitSchema = z.object({
  code: z.string().min(1, 'Kode benefit wajib diisi'),
  name: z.string().min(1, 'Nama benefit wajib diisi'),
  type: z.enum(['ALLOWANCE', 'INSURANCE', 'THR', 'BONUS', 'FACILITY', 'OTHER']),
  amount: z.number().positive('Jumlah harus positif').optional(),
  description: z.string().optional(),
});
export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;

export const createAssetSchema = z.object({
  code: z.string().min(1, 'Kode aset wajib diisi'),
  name: z.string().min(1, 'Nama aset wajib diisi'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  brand: z.string().optional(),
  serialNumber: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  purchaseDate: z.string().optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const createTrainingSchema = z.object({
  title: z.string().min(1, 'Judul training wajib diisi'),
  description: z.string().optional(),
  type: z.enum(['ONLINE', 'OFFLINE', 'SELF_PACED']),
  category: z.enum(['GENERAL', 'K3', 'MANAGEMENT', 'COMPLIANCE']).optional(),
  recommendedViolationCategoryId: z.string().optional(),
  startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
  endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
  maxParticipants: z.number().int().positive().optional(),
});
export type CreateTrainingInput = z.infer<typeof createTrainingSchema>;

export const createResignationSchema = z.object({
  type: z.string().min(1, 'Tipe resignasi wajib diisi'),
  reason: z.string().min(1, 'Alasan resignasi wajib diisi'),
  resignationDate: z.string().min(1, 'Tanggal resignasi wajib diisi'),
  notes: z.string().optional(),
});
export type CreateResignationInput = z.infer<typeof createResignationSchema>;

export const createCertificationSchema = z.object({
  name: z.string().min(1, 'Nama sertifikasi wajib diisi'),
  issuer: z.string().optional(),
  certificateNumber: z.string().optional(),
  issueDate: z.string().min(1, 'Tanggal terbit wajib diisi'),
  expiryDate: z.string().optional(),
});
export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;

export const eligibilityRuleSchema = z.object({
  benefitId: z.string().min(1, 'Benefit wajib dipilih'),
  gradeId: z.string().optional(),
  departmentId: z.string().optional(),
});
export type EligibilityRuleInput = z.infer<typeof eligibilityRuleSchema>;
