import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request } from '@/lib/http';
import { makeCrudHooks } from '@/features/_shared/crud';

export interface Customer {
  id: string;
  code: string | null;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  creditLimit: number | null;
  patientId: string | null;
  referredByCustomerId: string | null;
  loyaltyPoints: number;
  isActive: boolean;
}

export const customerHooks = makeCrudHooks<Customer, Record<string, unknown>>(
  'customers',
  'customers',
);

export interface CustomerDeposit {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  date: string;
}

export function useCustomerDeposits(customerId: string | null) {
  return useQuery({
    queryKey: ['customers', 'deposits', customerId],
    queryFn: () =>
      request<{ deposits: CustomerDeposit[]; balance: number }>(
        'GET',
        `/customers/${customerId}/deposits`,
      ),
    enabled: !!customerId,
  });
}

export function useAddCustomerDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...body
    }: {
      customerId: string;
      amount: number;
      type?: string;
      note?: string;
      date?: string;
    }) => request('POST', `/customers/${customerId}/deposits`, { body }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['customers', 'deposits'] }),
  });
}
