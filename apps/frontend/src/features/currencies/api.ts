import { makeCrudHooks } from '@/features/_shared/crud';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  exchangeRate: number;
  isActive: boolean;
}

export const currencyHooks = makeCrudHooks<Currency, Record<string, unknown>>(
  'currencies',
  'currencies',
);
