import { makeCrudHooks } from '@/features/_shared/crud';

export interface Manufacturer {
  id: string;
  name: string;
  code: string | null;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  imageUrl: string | null;
  note: string | null;
  isActive: boolean;
}

/** Manufacturer CRUD hooks (backend routes under /manufacturers). */
export const manufacturerHooks = makeCrudHooks<
  Manufacturer,
  Record<string, unknown>
>('manufacturers', 'manufacturers');
