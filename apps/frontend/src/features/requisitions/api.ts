import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

/** A requisition row as returned by the list endpoint. */
export interface RequisitionListRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  branchId: string;
  fromBranchId: string | null;
  fromDepartmentName: string | null;
  toDepartmentName: string | null;
  localPurchase: boolean;
  grandTotal: string | number;
  convertedToTransferId: string | null;
}

/** A requisition line item (detail). */
export interface RequisitionItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  quantity: string | number;
  unitPrice: string | number;
  netUnitPrice: string | number;
  discount: string | number;
  discountSpec: string | null;
  taxRate: string | number;
  taxRateId: string | null;
  taxAmount: string | number;
  subtotal: string | number;
}

/** A status-history entry (approval comment trail). */
export interface RequisitionStatusEntry {
  id: string;
  status: string;
  comment: string | null;
  createdByName: string | null;
  createdAt: string;
}

/** A full requisition (detail/edit). */
export interface RequisitionDetail extends RequisitionListRow {
  fromDepartmentId: string | null;
  toDepartmentId: string | null;
  note: string | null;
  attachmentUrl: string | null;
  orderDiscount: string | number;
  orderDiscountSpec: string | null;
  orderTax: string | number;
  shipping: string | number;
  subtotal: string | number;
  totalTax: string | number;
  items: RequisitionItem[];
  statusHistory: RequisitionStatusEntry[];
}

const KEY = ['requisitions'] as const;

export function useInfiniteRequisitions(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<RequisitionListRow>(KEY, '/requisitions', params);
}

/** Fetch one requisition (detail/edit hydration). */
export function useRequisition(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => request<RequisitionDetail>('GET', `/requisitions/${id}`),
    enabled: !!id,
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/requisitions', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request('PATCH', `/requisitions/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Approve / reject / receive a requisition (optional comment). */
export function useRequisitionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: 'approve' | 'reject' | 'receive';
      body?: Record<string, unknown>;
    }) => request('POST', `/requisitions/${id}/${action}`, { body: body ?? {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Convert an approved requisition into a stock transfer. */
export function useConvertRequisitionToTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: Record<string, unknown> }) =>
      request('POST', `/requisitions/${id}/convert-to-transfer`, {
        body: body ?? {},
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
}

export function useDeleteRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/requisitions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
