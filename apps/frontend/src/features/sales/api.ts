import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';
import type { WarehouseDetail } from '@/features/_shared/warehouse';

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
  /** Product unit name, resolved server-side (sale lines have no product relation). */
  unit: string | null;
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

/** The invoice "To" party, with the contact + GST fields the detail view/email need. */
export interface SaleCustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNo: string | null;
}

export interface SaleDetail extends SaleListRow {
  /** Richer than the list row's `{id,name}` — carries contact + GST fields. */
  customer: SaleCustomerDetail | null;
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
  /** Warehouse (branch) summary resolved server-side; null if unresolved. */
  warehouse: WarehouseDetail | null;
  /** Staff name resolved from `createdBy`; null if unknown/unresolved. */
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
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
    limit?: number;
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

/**
 * Render the sale's "Template Invoice" (via the mapped kalnostics
 * `inventory_invoice` print template) and open the resulting PDF in a new tab.
 * Fetches the binary through the authed `api` instance (so the Bearer token +
 * 401-refresh apply) rather than `request`, which unwraps the JSON envelope.
 * @throws Error with a human-readable message (e.g. no template configured)
 */
export async function openSalePdf(saleId: string): Promise<void> {
  let blob: Blob;
  try {
    const res = await api.request<Blob>({
      method: 'GET',
      url: `/sales/${saleId}/invoice-pdf`,
      responseType: 'blob',
    });
    blob = res.data;
  } catch (err) {
    throw new Error(await extractBlobErrorMessage(err));
  }
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // Revoke later so the opened tab has time to load the document first.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) {
    throw new Error('Pop-up blocked — allow pop-ups to view the invoice.');
  }
}

/**
 * Pull a readable message out of a failed blob request: the backend returns its
 * JSON `{ error: { message } }` envelope even on the PDF route, but axios hands
 * it back as a Blob when `responseType: 'blob'`, so parse it here.
 */
async function extractBlobErrorMessage(err: unknown): Promise<string> {
  const fallback = 'Could not generate the invoice PDF.';
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as {
        error?: { message?: string };
      };
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      /* non-JSON body — fall through to the generic message */
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
