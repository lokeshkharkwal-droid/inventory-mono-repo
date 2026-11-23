import { makeCrudHooks } from '@/features/_shared/crud';

/** Tenant drug-master record (EZHT `pharmacy_drug`). */
export interface Drug {
  id: string;
  name: string;
  dosage: string | null;
  sideEffect: string | null;
  indication: string | null;
  contraIndication: string | null;
  formulation: string | null;
  storageCondition: string | null;
  precaution: string | null;
  safety: string | null;
  therapeuticGroup: string | null;
  isActive: boolean;
}

export const drugHooks = makeCrudHooks<Drug, Record<string, unknown>>(
  'drugs',
  'drugs',
);
