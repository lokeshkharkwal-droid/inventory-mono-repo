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

export interface SaleItemDetail {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  optionId: string | null;
  quantity: number;
  price: number;
  realUnitPrice: number;
  netUnitPrice: number;
  taxRate: number;
  taxAmount: number;
  taxMethod: string | null;
  discount: number;
  discountSpec: string | null;
  subtotal: number;
  hsnCode: string | null;
  serialNo: string | null;
  expiryDate: string | null;
  packSize: number | null;
  packQuantity: number | null;
  igst: number;
  cgst: number;
  sgst: number;
}

export interface SalePaymentDetail {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  date: string;
  note: string | null;
  chequeNo: string | null;
  ccNo: string | null;
  giftCardNo: string | null;
}

export interface SaleDetail extends SaleListRow {
  branchId: string;
  billerId: string | null;
  billerName: string | null;
  subtotal: number;
  productDiscount: number;
  orderDiscount: number;
  orderDiscountSpec: string | null;
  orderTax: number;
  orderTaxId: string | null;
  totalTax: number;
  shipping: number;
  roundoff: number;
  totalItems: number;
  paymentTerm: number | null;
  dueDate: string | null;
  gstNumber: string | null;
  gstState: string | null;
  taxMethod: string | null;
  igst: number;
  cgst: number;
  sgst: number;
  attachmentUrl: string | null;
  note: string | null;
  staffNote: string | null;
  doctorName: string | null;
  items: SaleItemDetail[];
  payments: SalePaymentDetail[];
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

export function useDeleteSalePayment(saleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      request('DELETE', `/sales/${saleId}/payments/${paymentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/sales/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
