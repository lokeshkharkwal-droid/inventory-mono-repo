import { makeCrudHooks } from '@/features/_shared/crud';

export interface Biller {
  id: string;
  code: string | null;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

export const billerHooks = makeCrudHooks<Biller, Record<string, unknown>>(
  'billers',
  'billers',
);
