import { z } from 'zod';

export const clockInSchema = z.object({
  method: z.enum(['GPS', 'QR', 'FACE', 'FINGERPRINT', 'MANUAL']).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  photo: z.string().optional(),
});
export type ClockInInput = z.infer<typeof clockInSchema>;

export const clockOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});
export type ClockOutInput = z.infer<typeof clockOutSchema>;

export const overtimeSchema = z.object({
  date: z.string().min(1, 'Tanggal wajib diisi'),
  startTime: z.string().min(1, 'Waktu mulai wajib diisi'),
  endTime: z.string().min(1, 'Waktu selesai wajib diisi'),
  reason: z.string().min(1, 'Alasan wajib diisi'),
});
export type OvertimeInput = z.infer<typeof overtimeSchema>;

export const shiftSchema = z.object({
  name: z.string().min(1, 'Nama shift wajib diisi'),
  code: z.string().min(1, 'Kode shift wajib diisi'),
  startTime: z.string().min(1, 'Jam mulai wajib diisi'),
  endTime: z.string().min(1, 'Jam selesai wajib diisi'),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  toleranceMinutes: z.number().int().optional(),
  graceMinutes: z.number().int().optional(),
  color: z.string().optional(),
  isNightShift: z.boolean().optional(),
});
export type ShiftInput = z.infer<typeof shiftSchema>;
