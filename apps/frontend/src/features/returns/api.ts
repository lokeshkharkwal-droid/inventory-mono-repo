import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';
import { openPdfBlob } from '@/lib/print';

export interface ReturnRow {
  id: string;
  reference: string;
  date: string;
  total: number;
}

/** A sale-return list row (EZHT return_sales columns). */
export interface SaleReturnRow extends ReturnRow {
  saleReference: string | null;
  customer: string | null;
  surcharge: number;
  grandTotal: number;
  paid: number;
  paymentStatus: string;
}

/** A payment recorded against a sale return. */
export interface SaleReturnPayment {
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

/** One returned line in the detail modal. */
export interface SaleReturnItem {
  id: string;
  productName: string;
  productCode: string | null;
  serialNo: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

/** A sale return enriched for the detail modal (EZHT modal_view for a return). */
export interface SaleReturnDetail extends SaleReturnRow {
  note: string | null;
  totalTax: number;
  orderDiscount: number;
  createdByName: string | null;
  warehouse: { name: string | null; address: string | null; phone: string | null; email: string | null } | null;
  sale: {
    reference: string;
    customer: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      gstNo: string | null;
    } | null;
  } | null;
  items: SaleReturnItem[];
  payments: SaleReturnPayment[];
}

/** A purchase-returns list row (EZHT columns). */
export interface PurchaseReturnRow {
  id: string;
  reference: string;
  date: string;
  purchaseReference: string | null;
  supplierName: string | null;
  surcharge: number;
  grandTotal: number;
}
/** A deliveries-list row (EZHT columns: Date / DO Ref / Sale Ref / Customer / Address). */
export interface DeliveryRow {
  id: string;
  /** Delivery-order reference (DO). */
  reference: string;
  saleReferenceNo: string | null;
  customer: string | null;
  address: string | null;
  date: string;
  status: string;
}

export interface DeliveryItem {
  id: string;
  productName: string;
  productCode: string | null;
  quantity: number;
  serialNo: string | null;
  expiryDate: string | null;
}

/** A delivery enriched for the detail modal (delivery + sale items + created-by). */
export interface DeliveryDetail extends DeliveryRow {
  saleId: string;
  note: string | null;
  createdByName: string | null;
  items: DeliveryItem[];
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
export function useInfinitePurchaseReturns(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<PurchaseReturnRow>(
    ['purchase-returns'],
    '/purchase-returns',
    params,
  );
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
export function useInfiniteSaleReturns(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<SaleReturnRow>(
    ['sale-returns'],
    '/sale-returns',
    params,
  );
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

/** One sale return enriched for the detail modal (From/To, items, payments). */
export function useSaleReturnDetail(id: string | null) {
  return useQuery({
    queryKey: ['sale-returns', 'detail', id],
    queryFn: () =>
      request<SaleReturnDetail>('GET', `/sale-returns/${id}/detail`),
    enabled: !!id,
  });
}

/** Payment history for a sale return (View Payments). */
export function useSaleReturnPayments(id: string | null) {
  return useQuery({
    queryKey: ['sale-returns', 'payments', id],
    queryFn: () =>
      request<SaleReturnPayment[]>('GET', `/sale-returns/${id}/payments`),
    enabled: !!id,
  });
}

/** Add a payment to a sale return (blocked server-side when fully settled). */
export function useAddSaleReturnPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request('POST', `/sale-returns/${id}/payments`, { body: input }),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['sale-returns'] });
      qc.invalidateQueries({ queryKey: ['sale-returns', 'payments', id] });
      qc.invalidateQueries({ queryKey: ['sale-returns', 'detail', id] });
    },
  });
}

/**
 * Render the sale-return PDF (mapped `inventory_sale_return` template) and open it
 * in a new tab — mirrors `openSalePdf` / `openDeliveryPdf`.
 */
export async function openSaleReturnPdf(id: string): Promise<void> {
  return openPdfBlob(`/sale-returns/${id}/pdf`, 'sale-return');
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
export function useInfiniteDeliveries(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<DeliveryRow>(
    ['sale-deliveries'],
    '/sale-deliveries',
    params,
  );
}
export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/sale-deliveries', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-deliveries'] }),
  });
}
/** One delivery enriched for the detail modal (EZHT `view_delivery`). */
export function useDeliveryDetail(id: string | null) {
  return useQuery({
    queryKey: ['sale-deliveries', 'detail', id],
    queryFn: () => request<DeliveryDetail>('GET', `/sale-deliveries/${id}`),
    enabled: !!id,
  });
}
export function useUpdateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request('PATCH', `/sale-deliveries/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-deliveries'] }),
  });
}
export function useDeleteDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/sale-deliveries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-deliveries'] }),
  });
}

/**
 * Render the delivery note (via the mapped kalnostics `inventory_delivery` print
 * template) and open the PDF in a new tab — mirrors the sales `openSalePdf`.
 * @throws Error with a human-readable message (e.g. no template configured)
 */
export async function openDeliveryPdf(id: string): Promise<void> {
  let blob: Blob;
  try {
    const res = await api.request<Blob>({
      method: 'GET',
      url: `/sale-deliveries/${id}/delivery-pdf`,
      responseType: 'blob',
    });
    blob = res.data;
  } catch (err) {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text()) as {
          error?: { message?: string };
        };
        if (parsed.error?.message) throw new Error(parsed.error.message);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error('Could not generate the delivery PDF.');
  }
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) throw new Error('Pop-up blocked — allow pop-ups to view the delivery.');
}
