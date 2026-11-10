import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';

export interface ReturnRow {
  id: string;
  reference: string;
  date: string;
  total: number;
}
export interface DeliveryRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  trackingNo: string | null;
}

// ── Purchase returns ──
export function usePurchaseReturns(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['purchase-returns', params],
    queryFn: () =>
      requestPaged<ReturnRow>('GET', '/purchase-returns', {
        query: { page: params.page, limit: params.limit },
      }),
    placeholderData: (p) => p,
  });
}
export function useCreatePurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/purchase-returns', { body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-returns'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Sale returns ──
export function useSaleReturns(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['sale-returns', params],
    queryFn: () =>
      requestPaged<ReturnRow>('GET', '/sale-returns', {
        query: { page: params.page, limit: params.limit },
      }),
    placeholderData: (p) => p,
  });
}
export function useCreateSaleReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/sale-returns', { body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale-returns'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Deliveries ──
export function useDeliveries(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['sale-deliveries', params],
    queryFn: () =>
      requestPaged<DeliveryRow>('GET', '/sale-deliveries', {
        query: { page: params.page, limit: params.limit },
      }),
    placeholderData: (p) => p,
  });
}
export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/sale-deliveries', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-deliveries'] }),
  });
}
export function useDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      request('PATCH', `/sale-deliveries/${id}/status`, { body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-deliveries'] }),
  });
}
