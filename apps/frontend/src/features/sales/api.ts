import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

export interface SaleListRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  grandTotal: number;
  paid: number;
  paymentStatus: string;
  customer: { id: string; name: string } | null;
}

export interface SaleDetail extends SaleListRow {
  branchId: string;
  subtotal: number;
  orderTax: number;
  orderDiscount: number;
  shipping: number;
  note: string | null;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    taxRate: number;
    discount: number;
    subtotal: number;
  }[];
  payments: {
    id: string;
    amount: number;
    method: string;
    date: string;
  }[];
}

const KEY = ['sales'] as const;

export function useSales(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<SaleListRow>('GET', '/sales', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useInfiniteSales(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<SaleListRow>(['sales'], '/sales', params);
}

export function useSale(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => request<SaleDetail>('GET', `/sales/${id}`),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request<SaleDetail>('POST', '/sales', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request<SaleDetail>('PATCH', `/sales/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddSalePayment(saleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', `/sales/${saleId}/payments`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
