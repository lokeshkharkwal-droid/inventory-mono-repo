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
  // EZ Health Track parity fields.
  contactPerson: string | null;
  vatNo: string | null;
  gstNo: string | null;
  panNo: string | null;
  gstState: string | null;
  customerGroupId: string | null;
  // Patient clinical-registration fields.
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  gender: string | null;
  age: string | null;
  dob: string | null;
  registrationDate: string | null;
  patientType: string | null;
  address2: string | null;
  areaId: string | null;
  area: string | null;
  idType: string | null;
  uid: string | null;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  ccf1: string | null;
  ccf2: string | null;
  ccf3: string | null;
  ccf4: string | null;
  ccf5: string | null;
  ccf6: string | null;
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
