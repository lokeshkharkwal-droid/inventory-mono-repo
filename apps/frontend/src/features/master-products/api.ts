import { useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

/** A global master product a tenant can import. */
export interface MasterProduct {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  subCategory: string | null;
  unit: string | null;
  brand: string | null;
  price: number;
  cost: number;
  hsnCode: string | null;
  taxName: string | null;
}

/** Summary returned by the import endpoint. */
export interface MasterImportSummary {
  total: number;
  imported: number;
  skipped: number;
}

/** Browse importable masters (business JWT). */
export function useInfiniteMasterProducts(params: { search?: string } = {}) {
  return useInfiniteList<MasterProduct>(['master-products'], '/master-products', params);
}

/**
 * Import selected masters into the caller's tenant catalogue. Importing can
 * create products AND find-or-create categories/sub-categories/units/brands/
 * tax-rates, so every affected list cache is invalidated.
 */
export function useImportMasterProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      request<MasterImportSummary>('POST', '/master-products/import', {
        body: { ids },
      }),
    onSuccess: () => {
      for (const key of [
        'products',
        'categories',
        'sub-categories',
        'units',
        'brands',
        'tax-rates',
        'master-products',
      ]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
