import { makeCrudHooks } from '@/features/_shared/crud';

export interface Variant {
  id: string;
  name: string;
  values: string[];
  isActive: boolean;
}

export const variantHooks = makeCrudHooks<Variant, Record<string, unknown>>(
  'variants',
  'variants',
);
