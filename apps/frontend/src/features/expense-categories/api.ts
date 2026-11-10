import { makeCrudHooks } from '@/features/_shared/crud';

export interface ExpenseCategory {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
}

export const expenseCategoryHooks = makeCrudHooks<
  ExpenseCategory,
  Record<string, unknown>
>('expense-categories', 'expense-categories');
