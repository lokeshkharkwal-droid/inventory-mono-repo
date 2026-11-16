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
  // EZ Health Track parity fields.
  type: string | null;
  contactPerson: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  drugLicense: string | null;
  vatNo: string | null;
  gstNo: string | null;
  panNo: string | null;
  gstState: string | null;
  cf1: string | null;
  cf2: string | null;
  cf3: string | null;
  cf4: string | null;
  cf5: string | null;
  cf6: string | null;
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
