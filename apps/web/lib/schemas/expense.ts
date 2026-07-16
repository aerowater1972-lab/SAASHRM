import { z } from 'zod';

export const loanSchema = z.object({
  amount: z.number().min(1, 'Jumlah pinjaman wajib diisi'),
  installmentCount: z.number().min(1, 'Jumlah cicilan wajib diisi'),
  purpose: z.string().optional(),
  startDeductionFrom: z.string().optional(),
  notes: z.string().optional(),
});
export type LoanInput = z.infer<typeof loanSchema>;

const expenseClaimItemSchema = z.object({
  category: z.string().min(1, 'Kategori wajib dipilih'),
  description: z.string().min(1, 'Deskripsi item wajib diisi'),
  amount: z.number(),
  date: z.string().min(1, 'Tanggal wajib diisi'),
});

export const expenseClaimSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional(),
  items: z.array(expenseClaimItemSchema).min(1, 'Minimal satu item pengeluaran diperlukan'),
});
export type ExpenseClaimInput = z.infer<typeof expenseClaimSchema>;
