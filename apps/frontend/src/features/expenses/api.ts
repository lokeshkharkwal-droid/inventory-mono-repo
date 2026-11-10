import { makeCrudHooks } from '@/features/_shared/crud';

export interface Expense {
  id: string;
  categoryId: string | null;
  reference: string;
  amount: number;
  date: string;
  note: string | null;
}

export const expenseHooks = makeCrudHooks<Expense, Record<string, unknown>>(
  'expenses',
  'expenses',
);
