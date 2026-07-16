import { z } from 'zod';

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid('Tipe cuti wajib dipilih'),
  startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
  endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
  reason: z.string().min(1, 'Alasan cuti wajib diisi'),
  documentUrl: z.string().optional(),
  isUrgent: z.boolean().optional(),
});
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Nama tipe cuti wajib diisi'),
  code: z.string().min(1, 'Kode tipe cuti wajib diisi'),
  description: z.string().optional(),
  isPaid: z.boolean().optional(),
  maxConsecutiveDays: z.number().int().optional(),
  requiresDocument: z.boolean().optional(),
  carryForwardLimit: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;
