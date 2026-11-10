import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { makeCrudHooks } from '@/features/_shared/crud';

export interface BloodDonor {
  id: string;
  name: string;
  bloodGroup: string;
  phone: string | null;
  email: string | null;
  status: string;
  lastDonationDate: string | null;
}

/** Donor CRUD reuses the generic factory (backend routes under /blood/donors). */
export const donorHooks = makeCrudHooks<BloodDonor, Record<string, unknown>>(
  'blood/donors',
  'blood-donors',
);

export interface BloodDonation {
  id: string;
  bloodGroup: string;
  component: string;
  bagNumber: string | null;
  collectedAt: string;
  expiryDate: string | null;
  status: string;
  donor: { id: string; name: string } | null;
}

export interface BloodInventoryRow {
  bloodGroup: string;
  component: string;
  units: number;
}

export interface BloodRequest {
  id: string;
  bloodGroup: string;
  component: string;
  units: number;
  patientName: string | null;
  status: string;
}

const KEY = ['bloodbank'] as const;

export function useDonations(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...KEY, 'donations', params],
    queryFn: () =>
      requestPaged<BloodDonation>('GET', '/blood/donations', {
        query: { page: params.page, limit: params.limit },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/blood/donations', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDonationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      request('PATCH', `/blood/donations/${id}/status`, { body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useBloodInventory() {
  return useQuery({
    queryKey: [...KEY, 'inventory'],
    queryFn: () => request<BloodInventoryRow[]>('GET', '/blood/inventory'),
  });
}

export function useBloodRequests(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...KEY, 'requests', params],
    queryFn: () =>
      requestPaged<BloodRequest>('GET', '/blood/requests', {
        query: { page: params.page, limit: params.limit },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateBloodRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/blood/requests', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useBloodRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      request('PATCH', `/blood/requests/${id}/status`, { body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface BloodCrossMatch {
  id: string;
  requestId: string;
  donationId: string;
  result: string;
  isAutoResult: boolean;
  note: string | null;
  date: string;
}

export function useCrossMatches(requestId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'cross-matches', requestId],
    queryFn: () =>
      requestPaged<BloodCrossMatch>('GET', '/blood/cross-matches', {
        query: { requestId: requestId ?? undefined, limit: 100 },
      }),
    enabled: !!requestId,
  });
}

export function useCreateCrossMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      donationId: string;
      result?: string;
      note?: string;
    }) => request<BloodCrossMatch>('POST', '/blood/cross-matches', { body: input }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...KEY, 'cross-matches'] }),
  });
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const BLOOD_COMPONENTS = ['WHOLE_BLOOD', 'RBC', 'PLASMA', 'PLATELETS'];
