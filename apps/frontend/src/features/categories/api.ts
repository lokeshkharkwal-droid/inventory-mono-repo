import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged, type PageMeta } from '@/lib/http';
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
