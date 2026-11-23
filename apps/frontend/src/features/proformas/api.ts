import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

export interface ProformaListRow {
  id: string;
  name: string | null;
  reference: string;
  date: string;
  status: string;
  grandTotal: number;
  /** Assigned branch names (EZHT "Branch Selection" column), comma-joined in the UI. */
  branchNames: string[];
  /** Live branch mappings ("Branch Relations" column). */
  relations?: { id: string; label: string | null }[];
}

const KEY = ['proformas'] as const;

export function useProformas(params: {
  page: number;
  limit: number;
  search?: string;
}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<ProformaListRow>('GET', '/proformas', {
        query: {
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
        },
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

/**
 * Returns a function that refreshes the proformas list (every page / filter
 * variant of {@link useInfiniteProformas} and the single-proforma queries).
 *
 * The action modals opened from a row (Lab Test / Branch mapping, …) call this
 * when they close so any change made inside — a mapped lab test, an assigned
 * branch, etc. — shows on the list immediately, without a manual refresh.
 */
export function useInvalidateProformas() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: KEY });
  };
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
  /** Line tax (stored per line; the proforma's orderTax is their sum). */
  taxAmount?: number | string;
  subtotal: number;
}

/** A clinical (lab / radiology / blood) line stored on a proforma. */
export interface ProformaLabTest {
  name: string;
  price: number | string;
  type?: string;
}

/** A full proforma with its items (for the Detail modal). */
export interface ProformaDetail extends ProformaListRow {
  name: string | null;
  note: string | null;
  items: ProformaItem[];
  /**
   * Order-level values the Add/Edit form no longer edits but carries through
   * unchanged on update, so saving an older proforma doesn't wipe them.
   * Decimals arrive as strings.
   */
  orderDiscount?: number | string | null;
  shipping?: number | string | null;
  orderTax?: number | string | null;
  labTests?: ProformaLabTest[] | null;
  customerId?: string | null;
  /** Customer's name, resolved server-side (details modal). */
  customerName?: string | null;
  createdBy?: string | null;
  /** Created-by staff name, resolved server-side (details modal). */
  createdByName?: string | null;
  createdAt?: string;
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
    onSuccess: () => {
      // Refresh the modal's own panes immediately. The list (Branch Relations
      // column) is refreshed when the modal closes — see useInvalidateProformas.
      void qc.invalidateQueries({ queryKey: RELATIONS_KEY(proformaId) });
    },
  });
}

/** Remove a proforma mapping. */
export function useRemoveProformaRelation(proformaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationId: string) =>
      request('DELETE', `/proformas/${proformaId}/relations/${relationId}`),
    onSuccess: () => {
      // Refresh the modal's own panes immediately. The list is refreshed when
      // the modal closes — see useInvalidateProformas.
      void qc.invalidateQueries({ queryKey: RELATIONS_KEY(proformaId) });
    },
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
