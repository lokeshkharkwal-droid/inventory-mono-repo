import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/http';

export interface InventorySettings {
  defaultCurrencyCode: string | null;
  isOversellingAllowed: boolean;
  rowsPerPage: number;
  decimalPlaces: number;
  purchasePrefix: string;
  salePrefix: string;
  transferPrefix: string;
  requisitionPrefix: string;
  /** Whether a cashier PIN is configured (the raw PIN is never returned). */
  hasPosPin: boolean;
  businessName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
}

const KEY = ['settings'] as const;

export function useSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => request<InventorySettings>('GET', '/settings'),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request<InventorySettings>('PUT', '/settings', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
