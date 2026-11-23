import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

export interface QuoteListRow {
  id: string;
  reference: string;
  date: string;
  type: string;
  status: string;
  grandTotal: number;
  customerId: string | null;
  supplierId: string | null;
  customerName: string | null;
  supplierName: string | null;
  /** Customer (SALE) or supplier (PURCHASE) display name. */
  partyName: string | null;
  sourceBranch: string | null;
  convertedToId: string | null;
}

export interface QuoteItemDetail {
  id: string;
  /** Null for a manual (off-catalogue) line. */
  productId: string | null;
  productName: string;
  productCode: string | null;
  serialNo: string | null;
  quantity: number;
  unitPrice: number;
  netUnitPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  /** Original per-unit discount spec as entered ("10%" or flat). */
  discountSpec: string | null;
  subtotal: number;
  packSize: string | null;
  packQuantity: number | null;
  productType: string | null;
  optionId: string | null;
}

export interface QuoteStatusHistoryEntry {
  id: string;
  status: string;
  comment: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface QuotePartyDetail {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstNo?: string | null;
}

export interface QuoteWarehouseDetail {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  gstNumber: string | null;
}

export interface QuoteReferralInfo {
  sourceType?: string;
  contactFname?: string;
  contactMname?: string;
  contactLname?: string;
  businessName?: string;
  businessAddress?: string;
}

export interface QuoteDetail {
  id: string;
  reference: string;
  date: string;
  type: 'SALE' | 'PURCHASE';
  status: string;
  customerId: string | null;
  supplierId: string | null;
  billerId: string | null;
  warehouseId: string | null;
  subtotal: number;
  orderTax: number;
  orderDiscount: number;
  /** Original order-discount spec as entered ("5%" or flat). */
  orderDiscountSpec: string | null;
  /** Order-tax percentage as entered (orderTax holds the resolved amount). */
  orderTaxPercent: number | null;
  productDiscount: number;
  totalTax: number;
  totalItems: number;
  shipping: number;
  grandTotal: number;
  gstNumber: string | null;
  gstState: string | null;
  attachmentUrl: string | null;
  referralInfo: QuoteReferralInfo | null;
  note: string | null;
  convertedToId: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  items: QuoteItemDetail[];
  party: QuotePartyDetail | null;
  warehouse: QuoteWarehouseDetail | null;
  statusHistory: QuoteStatusHistoryEntry[];
}

const KEY = ['quotes'] as const;

export function useQuotes(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<QuoteListRow>('GET', '/quotes', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useInfiniteQuotes(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<QuoteListRow>(KEY, '/quotes', params);
}

/** Full quote detail (party, branch, creator, status history) for the view page. */
export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => request<QuoteDetail>('GET', `/quotes/${id}/detail`),
    enabled: Boolean(id),
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/quotes', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request('PATCH', `/quotes/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useConvertQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('POST', `/quotes/${id}/convert`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/quotes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Bulk soft-delete selected quotes (EZHT listing bulk action). */
export function useBulkDeleteQuotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      request('POST', '/quotes/bulk-delete', { body: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      comment,
    }: {
      id: string;
      status: string;
      comment?: string;
    }) =>
      request('PATCH', `/quotes/${id}/status`, { body: { status, comment } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
