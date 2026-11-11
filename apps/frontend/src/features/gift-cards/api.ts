import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

export interface GiftCard {
  id: string;
  code: string;
  value: number;
  balance: number;
  status: string;
  expiryDate: string | null;
}

const KEY = ['gift-cards'] as const;

export function useGiftCards(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<GiftCard>('GET', '/gift-cards', {
        query: { page: params.page, limit: params.limit, search: params.search || undefined },
      }),
    placeholderData: (prev) => prev,
  });
}

/** Infinite-scroll variant of {@link useGiftCards}. */
export function useInfiniteGiftCards(
  params: { search?: string; extra?: Record<string, string | number | boolean | undefined> } = {},
) {
  return useInfiniteList<GiftCard>(KEY, '/gift-cards', params);
}

export function useCreateGiftCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/gift-cards', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRedeemGiftCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      request('POST', `/gift-cards/${id}/redeem`, { body: { amount } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteGiftCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/gift-cards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
