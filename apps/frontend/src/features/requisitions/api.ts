import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';

export interface RequisitionListRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  fromBranchId: string | null;
}

const KEY = ['requisitions'] as const;

export function useRequisitions(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<RequisitionListRow>('GET', '/requisitions', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
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
