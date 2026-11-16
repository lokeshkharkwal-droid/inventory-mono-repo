import { makeCrudHooks } from '@/features/_shared/crud';

export interface Expense {
  id: string;
  categoryId: string | null;
  reference: string;
  amount: number;
  date: string;
  note: string | null;
  // EZ Health Track parity fields.
  warehouseId: string | null;
  hsnCode: string | null;
  taxMethod: string | null;
  gstNo: string | null;
  attachmentUrl: string | null;
}

export const expenseHooks = makeCrudHooks<Expense, Record<string, unknown>>(
  'expenses',
  'expenses',
);
