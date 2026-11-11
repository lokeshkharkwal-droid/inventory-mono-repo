import { useInfiniteQuery } from '@tanstack/react-query';
import { requestPaged } from '@/lib/http';

/** Query params for an infinite (scroll-loaded) list. */
export interface InfiniteListParams {
  search?: string;
  /** Extra query params (filters, parent ids, etc.). */
  extra?: Record<string, string | number | boolean | undefined>;
  /** Records fetched per batch (backend hard-caps at 100). */
  limit?: number;
  /** Disable the query until true. */
  enabled?: boolean;
}

/** Default batch size for infinite scrolling across the app. */
export const INFINITE_PAGE_SIZE = 20;

/** What {@link useInfiniteList} returns — a flat rows array + load-more controls. */
export interface InfiniteListResult<T> {
  rows: T[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasMore: boolean;
  isFetchingMore: boolean;
  fetchMore: () => void;
  refetch: () => void;
}

/**
 * Shared infinite-scroll data source for every paginated inventory list. Wraps
 * TanStack `useInfiniteQuery` over the standard `{ data, meta }` envelope and
 * exposes a flat `rows` array plus `fetchMore`/`hasMore`/`isFetchingMore`.
 *
 * - Pages are appended (previously loaded rows stay visible).
 * - `getNextPageParam` stops once `page >= totalPages` (server says "no more").
 * - The query key includes `search`/`extra`, so changing a filter resets the
 *   accumulated rows and refetches from page 1 automatically.
 * - Offset pages are disjoint, so no duplicate rows across batches.
 *
 * @param key   stable cache key prefix for the resource (e.g. `['products']`)
 * @param path  API path (e.g. `/products`)
 * @param params search/filters/limit
 */
export function useInfiniteList<T>(
  key: readonly unknown[],
  path: string,
  params: InfiniteListParams = {},
) {
  const limit = params.limit ?? INFINITE_PAGE_SIZE;
  const search = params.search?.trim() || undefined;
  const extra = params.extra;

  const query = useInfiniteQuery({
    queryKey: [...key, 'infinite', { search, extra, limit }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      requestPaged<T>('GET', path, {
        query: { page: pageParam as number, limit, search, ...extra },
      }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
    enabled: params.enabled ?? true,
  });

  const rows = (query.data?.pages ?? []).flatMap((p) => p.data);

  return {
    rows,
    total: query.data?.pages[0]?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    /** More pages exist on the server. */
    hasMore: query.hasNextPage,
    /** A next batch is currently being fetched. */
    isFetchingMore: query.isFetchingNextPage,
    /** Fetch + append the next batch. */
    fetchMore: query.fetchNextPage,
    refetch: query.refetch,
  };
}
