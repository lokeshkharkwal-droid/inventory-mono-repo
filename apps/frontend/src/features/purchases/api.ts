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
  productId: string;
  productName: string;
  productCode: string | null;
  optionId: string | null;
  quantity: number;
  cost: number;
  netUnitCost: number;
  realUnitCost: number;
  mrp: number | null;
  taxRate: number;
  taxAmount: number;
  taxMethod: string | null;
  discount: number;
  discountSpec: string | null;
  subtotal: number;
  batchNo: string | null;
  expiryDate: string | null;
  hsnCode: string | null;
  partNo: string | null;
  packSize: number | null;
  packQuantity: number | null;
  freePackQuantity: number | null;
  igst: number;
  cgst: number;
  sgst: number;
}

export interface PurchasePayment {
  id: string;
  amount: number;
  method: string;
  date: string;
  reference: string | null;
  note: string | null;
  chequeNo: string | null;
}

export interface PurchaseDetail extends PurchaseListRow {
  branchId: string;
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
  editNote: string | null;
  isEdited: boolean;
  isBloodDonation: boolean;
  donorName: string | null;
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

export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request<PurchaseDetail>('PATCH', `/purchases/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/purchases/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface SupplierOutstandingRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  grandTotal: number;
  paid: number;
  paymentStatus: string;
  balance: number;
}

/** A supplier's purchases that still carry an outstanding balance. */
export function useSupplierOutstanding(supplierId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'supplier-outstanding', supplierId],
    queryFn: () =>
      request<{ purchases: SupplierOutstandingRow[]; totalDue: number }>(
        'GET',
        `/purchases/supplier/${supplierId}/outstanding`,
      ),
    enabled: !!supplierId,
  });
}

/** Record a bulk payment allocated across a supplier's open purchases. */
export function useAddSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/purchases/supplier-payments', { body: input }),
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
