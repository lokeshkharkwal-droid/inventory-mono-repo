import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

export interface PurchaseListRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  grandTotal: number;
  paid: number;
  paymentStatus: string;
  supplier: { id: string; name: string } | null;
}

export interface PurchaseItem {
  id: string;
  productName: string;
  productCode: string | null;
  quantity: number;
  cost: number;
  taxAmount: number;
  discount: number;
  subtotal: number;
}

export interface PurchasePayment {
  id: string;
  amount: number;
  method: string;
  date: string;
  reference: string | null;
}

export interface PurchaseDetail extends PurchaseListRow {
  branchId: string;
  subtotal: number;
  orderTax: number;
  orderDiscount: number;
  shipping: number;
  note: string | null;
  items: PurchaseItem[];
  payments: PurchasePayment[];
}

const KEY = ['purchases'] as const;

export function usePurchases(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<PurchaseListRow>('GET', '/purchases', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useInfinitePurchases(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<PurchaseListRow>(['purchases'], '/purchases', params);
}

export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => request<PurchaseDetail>('GET', `/purchases/${id}`),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request<PurchaseDetail>('POST', '/purchases', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddPurchasePayment(purchaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', `/purchases/${purchaseId}/payments`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePurchasePayment(purchaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      request('DELETE', `/purchases/${purchaseId}/payments/${paymentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface PurchaseExpense {
  id: string;
  category: string | null;
  amount: number;
  reference: string | null;
  note: string | null;
  date: string;
}

export function usePurchaseExpenses(purchaseId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'expenses', purchaseId],
    queryFn: () =>
      request<{ expenses: PurchaseExpense[]; total: number }>(
        'GET',
        `/purchases/${purchaseId}/expenses`,
      ),
    enabled: !!purchaseId,
  });
}

export function useAddPurchaseExpense(purchaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', `/purchases/${purchaseId}/expenses`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'expenses'] }),
  });
}
