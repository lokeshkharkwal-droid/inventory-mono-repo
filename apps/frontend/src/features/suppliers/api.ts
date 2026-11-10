import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request } from '@/lib/http';
import { makeCrudHooks } from '@/features/_shared/crud';

export interface Supplier {
  id: string;
  code: string | null;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  openingBalance: number;
  isActive: boolean;
}

export const supplierHooks = makeCrudHooks<Supplier, Record<string, unknown>>(
  'suppliers',
  'suppliers',
);

export interface SupplierPayment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  date: string;
}

export function useSupplierPayments(supplierId: string | null) {
  return useQuery({
    queryKey: ['suppliers', 'payments', supplierId],
    queryFn: () =>
      request<{ payments: SupplierPayment[]; total: number }>(
        'GET',
        `/suppliers/${supplierId}/payments`,
      ),
    enabled: !!supplierId,
  });
}

export function useAddSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      ...body
    }: {
      supplierId: string;
      amount: number;
      method?: string;
      reference?: string;
      note?: string;
      date?: string;
    }) => request('POST', `/suppliers/${supplierId}/payments`, { body }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['suppliers', 'payments'] }),
  });
}
