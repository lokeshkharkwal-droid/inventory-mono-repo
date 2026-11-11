import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged, type PageMeta } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';
import type { Category, CategoryInput } from './types';

const KEY = ['categories'] as const;

interface ListParams {
  page: number;
  limit: number;
  search?: string;
}

/** Paginated category list. */
export function useCategories(params: ListParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<Category>('GET', '/categories', {
        query: {
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

/** Infinite-scroll category list. */
export function useInfiniteCategories(
  params: {
    search?: string;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  return useInfiniteList<Category>([...KEY], '/categories', params);
}

export type { PageMeta };

/** Create a category; invalidates the list on success. */
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      request<Category>('POST', '/categories', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Update a category; invalidates the list on success. */
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      request<Category>('PATCH', `/categories/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Soft-delete a category; invalidates the list on success. */
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<Category>('DELETE', `/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
