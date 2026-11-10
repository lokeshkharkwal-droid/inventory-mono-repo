import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';

export interface Admission {
  id: string;
  admissionNo: string;
  patientName: string;
  ward: string | null;
  bed: string | null;
  referringDoctor: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  status: string;
}

const KEY = ['ipd'] as const;

export function useAdmissions(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<Admission>('GET', '/ipd/admissions', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAdmit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/ipd/admissions', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDischarge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('POST', `/ipd/admissions/${id}/discharge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/ipd/admissions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ── Billing (charges) ──────────────────────────────────────────────────────────
export interface IpdCharge {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  date: string;
}

export interface IpdChargesResult {
  charges: IpdCharge[];
  total: number;
}

export function useAdmissionCharges(admissionId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'charges', admissionId],
    queryFn: () =>
      request<IpdChargesResult>('GET', `/ipd/admissions/${admissionId}/charges`),
    enabled: !!admissionId,
  });
}

export function useAddCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      admissionId,
      ...body
    }: {
      admissionId: string;
      description: string;
      category?: string;
      amount: number;
      date?: string;
    }) => request('POST', `/ipd/admissions/${admissionId}/charges`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'charges'] }),
  });
}
