import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

export interface ProformaListRow {
  id: string;
  name: string | null;
  reference: string;
  date: string;
  status: string;
  grandTotal: number;
}

const KEY = ['proformas'] as const;

export function useProformas(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<ProformaListRow>('GET', '/proformas', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useInfiniteProformas(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<ProformaListRow>(KEY, '/proformas', params);
}

export function useCreateProforma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/proformas', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProforma(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('PATCH', `/proformas/${id}`, { body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: [...KEY, 'detail', id] });
    },
  });
}

export function useDeleteProforma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/proformas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ── Proforma mappings (Lab Test / Branch) ────────────────────────────────────

/** A proforma ↔ entity mapping row. */
export interface ProformaRelation {
  id: string;
  proformaId: string;
  entityType: string;
  entityId: string;
  label: string | null;
  branchId: string | null;
  createdAt: string;
}

/** A single product line on a proforma (for the Detail modal + edit prefill). */
export interface ProformaItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  quantity: number;
  quantityMethod: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
}

/** A full proforma with its items (for the Detail modal). */
export interface ProformaDetail extends ProformaListRow {
  name: string | null;
  note: string | null;
  items: ProformaItem[];
}

const RELATIONS_KEY = (proformaId: string) =>
  ['proforma-relations', proformaId] as const;

/** List a proforma's live mappings, optionally filtered by `type`. */
export function useProformaRelations(proformaId: string, type?: string) {
  return useQuery({
    queryKey: [...RELATIONS_KEY(proformaId), type ?? 'all'],
    queryFn: () =>
      request<ProformaRelation[]>('GET', `/proformas/${proformaId}/relations`, {
        query: { type },
      }),
    enabled: Boolean(proformaId),
  });
}

/** Map a proforma to a lab test / branch. */
export function useAddProformaRelation(proformaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      entityType: string;
      entityId: string;
      label?: string;
    }) => request('POST', `/proformas/${proformaId}/relations`, { body }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: RELATIONS_KEY(proformaId) }),
  });
}

/** Remove a proforma mapping. */
export function useRemoveProformaRelation(proformaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationId: string) =>
      request('DELETE', `/proformas/${proformaId}/relations/${relationId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: RELATIONS_KEY(proformaId) }),
  });
}

/** Fetch one proforma with its items (Detail modal). */
export function useProformaDetail(proformaId: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'detail', proformaId],
    queryFn: () => request<ProformaDetail>('GET', `/proformas/${proformaId}`),
    enabled: enabled && Boolean(proformaId),
  });
}
