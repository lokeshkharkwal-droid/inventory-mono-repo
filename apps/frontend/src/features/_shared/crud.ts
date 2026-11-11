import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged, type PageMeta } from '@/lib/http';
import {
  useInfiniteList as useSharedInfiniteList,
  type InfiniteListParams,
} from './useInfiniteList';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  /** Extra query params (e.g. categoryId for sub-categories). */
  extra?: Record<string, string | number | boolean | undefined>;
}

export type { PageMeta };

/**
 * Build a standard set of TanStack Query CRUD hooks for a tenant-scoped,
 * paginated inventory resource — the shared list/create/update/delete contract
 * every master-data screen uses. `resource` is the API path segment (e.g.
 * `units`), `key` the query cache key.
 */
export function makeCrudHooks<T, TInput>(resource: string, key: string) {
  const KEY = [key] as const;

  function useList(params: ListParams) {
    return useQuery({
      queryKey: [...KEY, params],
      queryFn: () =>
        requestPaged<T>('GET', `/${resource}`, {
          query: {
            page: params.page,
            limit: params.limit,
            search: params.search || undefined,
            ...params.extra,
          },
        }),
      placeholderData: (prev) => prev,
    });
  }

  /** Infinite-scroll list for this resource (preferred over `useList`). */
  function useInfiniteList(params: InfiniteListParams = {}) {
    return useSharedInfiniteList<T>(KEY, `/${resource}`, params);
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: TInput) =>
        request<T>('POST', `/${resource}`, { body: input }),
      onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, input }: { id: string; input: TInput }) =>
        request<T>('PATCH', `/${resource}/${id}`, { body: input }),
      onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => request<T>('DELETE', `/${resource}/${id}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
  }

  return { useList, useInfiniteList, useCreate, useUpdate, useRemove };
}
