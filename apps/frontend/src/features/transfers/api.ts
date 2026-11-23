import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { openPdfBlob } from '@/lib/print';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

/** Render + open the transfer's PDF (kalnostics `inventory_transfer`). */
export function openTransferPdf(id: string): Promise<void> {
  return openPdfBlob(`/transfers/${id}/pdf`, 'transfer');
}

export interface TransferListRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  fromBranchId: string;
  toBranchId: string;
  total: string | number | null;
  totalTax: string | number | null;
  grandTotal: string | number | null;
}

/** A transfer line item (detail). */
export interface TransferItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  /** The specific source batch this line draws stock from (EZHT batch/option). */
  batchId: string | null;
  batchNo: string | null;
  quantity: string | number;
  expiryDate: string | null;
  productSerial: string | null;
  packSize: string | null;
  packQuantity: string | number | null;
  rate: string | number | null;
  mrp: string | number | null;
  packMrp: string | number | null;
  hsnCode: string | null;
  taxRate: string | number | null;
  taxAmount: string | number | null;
  subtotal: string | number | null;
}

/** A full transfer (detail/edit). */
export interface TransferDetail extends TransferListRow {
  note: string | null;
  fromDepartment: string | null;
  toDepartment: string | null;
  shipping: string | number | null;
  attachmentUrl: string | null;
  items: TransferItem[];
}

const KEY = ['transfers'] as const;

export function useTransfers(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<TransferListRow>('GET', '/transfers', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useInfiniteTransfers(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<TransferListRow>(KEY, '/transfers', params);
}

/** Fetch one transfer (detail/edit hydration). */
export function useTransfer(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => request<TransferDetail>('GET', `/transfers/${id}`),
    enabled: !!id,
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/transfers', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request('PATCH', `/transfers/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/transfers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTransferAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'send' | 'receive' }) =>
      request('POST', `/transfers/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
