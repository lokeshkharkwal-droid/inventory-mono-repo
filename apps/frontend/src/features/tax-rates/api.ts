import { makeCrudHooks } from '@/features/_shared/crud';

export interface TaxRate {
  id: string;
  code: string | null;
  name: string;
  rate: number;
  type: string;
  hsnCode: string | null;
  isActive: boolean;
}

export const taxRateHooks = makeCrudHooks<TaxRate, Record<string, unknown>>(
  'tax-rates',
  'tax-rates',
);
