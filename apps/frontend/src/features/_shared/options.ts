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
