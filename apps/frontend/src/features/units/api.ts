import { makeCrudHooks } from '@/features/_shared/crud';

export interface Unit {
  id: string;
  code: string | null;
  name: string;
  baseUnitId: string | null;
  operator: string | null;
  operationValue: number | null;
  isActive: boolean;
}

export const unitHooks = makeCrudHooks<Unit, Record<string, unknown>>(
  'units',
  'units',
);
