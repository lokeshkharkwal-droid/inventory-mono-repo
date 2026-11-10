import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';

export interface TransferListRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  fromBranchId: string;
  toBranchId: string;
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

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/transfers', { body: input }),
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
