import { makeCrudHooks } from '@/features/_shared/crud';

export interface Brand {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export const brandHooks = makeCrudHooks<Brand, Record<string, unknown>>(
  'brands',
  'brands',
);
