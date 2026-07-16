import { z } from 'zod';

export const goalSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional(),
  metric: z.string().optional(),
  targetValue: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const calibrationSchema = z.object({
  cycleId: z.string().min(1, 'Siklus review wajib dipilih'),
  facilitatorId: z.string().min(1, 'Fasilitator wajib dipilih'),
  sessionDate: z.string().min(1, 'Tanggal sesi wajib diisi'),
});
export type CalibrationInput = z.infer<typeof calibrationSchema>;
