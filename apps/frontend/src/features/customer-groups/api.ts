import { makeCrudHooks } from '@/features/_shared/crud';

export interface CustomerGroup {
  id: string;
  code: string | null;
  name: string;
  percentage: number;
  isActive: boolean;
}

export const customerGroupHooks = makeCrudHooks<
  CustomerGroup,
  Record<string, unknown>
>('customer-groups', 'customer-groups');
