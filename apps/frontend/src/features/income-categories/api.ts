import { makeCrudHooks } from '@/features/_shared/crud';

export interface IncomeCategory {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
}

export const incomeCategoryHooks = makeCrudHooks<
  IncomeCategory,
  Record<string, unknown>
>('income-categories', 'income-categories');
