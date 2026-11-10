import { makeCrudHooks } from '@/features/_shared/crud';

export interface Income {
  id: string;
  categoryId: string | null;
  reference: string;
  amount: number;
  date: string;
  note: string | null;
}

export const incomeHooks = makeCrudHooks<Income, Record<string, unknown>>(
  'incomes',
  'incomes',
);
