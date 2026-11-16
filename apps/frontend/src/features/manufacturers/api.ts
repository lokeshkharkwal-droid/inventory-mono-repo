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
  // EZ Health Track parity fields.
  contactPerson: string | null;
  vatNo: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  invoiceFooter: string | null;
  cf1: string | null;
  cf2: string | null;
  cf3: string | null;
  cf4: string | null;
  cf5: string | null;
  cf6: string | null;
}

/** Manufacturer CRUD hooks (backend routes under /manufacturers). */
export const manufacturerHooks = makeCrudHooks<
  Manufacturer,
  Record<string, unknown>
>('manufacturers', 'manufacturers');
