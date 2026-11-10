import { makeCrudHooks } from '@/features/_shared/crud';

export interface SubCategory {
  id: string;
  categoryId: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export const subCategoryHooks = makeCrudHooks<
  SubCategory,
  Record<string, unknown>
>('sub-categories', 'sub-categories');
