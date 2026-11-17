import { useQuery } from '@tanstack/react-query';
import { requestPaged } from '@/lib/http';

export interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

/** All tax rates for the tenant (small list) — used by per-line tax dropdowns. */
export function useTaxRates() {
  return useQuery({
    queryKey: ['tax-rates', 'options'],
    queryFn: async () =>
      (await requestPaged<TaxRateOption>('GET', '/tax-rates', {
        query: { page: 1, limit: 100 },
      })).data,
    staleTime: 5 * 60_000,
  });
}

export interface BillerOption {
  id: string;
  name: string;
}

/** All billers for the tenant — used by the sale biller dropdown. */
export function useBillers() {
  return useQuery({
    queryKey: ['billers', 'options'],
    queryFn: async () =>
      (await requestPaged<BillerOption>('GET', '/billers', {
        query: { page: 1, limit: 100 },
      })).data,
    staleTime: 5 * 60_000,
  });
}

export interface UserOption {
  id: string;
  name: string;
}

/**
 * Tenant staff (`{ id, name }`), proxied from kalnostics-new via
 * `GET /integration/users`. Used to resolve inventory `createdBy`/`openedBy`
 * person ids to names (e.g. the Register report's User column).
 */
export function useUsers() {
  return useQuery({
    queryKey: ['integration-users', 'options'],
    queryFn: async () =>
      (await requestPaged<UserOption>('GET', '/integration/users', {
        query: { page: 1, limit: 100 },
      })).data,
    staleTime: 5 * 60_000,
  });
}
