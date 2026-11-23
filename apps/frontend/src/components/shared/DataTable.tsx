import { useEffect, useRef, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BusyOverlay } from '@/components/BusyOverlay';
import { LottieLoader } from '@/components/LottieLoader';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/** A single column definition for the generic DataTable. */
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

/** Row-selection driver (adds a leading checkbox column when provided). */
export interface SelectionConfig {
  /** Currently-selected row ids. */
  selectedIds: Set<string>;
  /** Toggle one row id. */
  onToggle: (id: string) => void;
  /** Toggle all currently-loaded row ids (header checkbox). */
  onToggleAll: (ids: string[], allSelected: boolean) => void;
}

/** Infinite-scroll driver for the table (replaces offset pagination). */
export interface InfiniteConfig {
  /** More records exist on the server. */
  hasMore?: boolean;
  /** A next batch is currently loading. */
  isFetchingMore?: boolean;
  /** Fetch + append the next batch (called when the sentinel scrolls into view). */
  onLoadMore: () => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Initial load (no rows on screen yet). Shows the branded loader by default. */
  isLoading?: boolean;
  /**
   * Loading-state style for the INITIAL load. "lottie" (default) centers the
   * shared branded loader in the table body; "text" keeps the plain "Loading…"
   * row for callers that prefer it.
   */
  loadingVariant?: 'lottie' | 'text';
  /**
   * Re-querying over rows already on screen (a TanStack Query `isFetching`
   * during search / filter / pagination). Shows a subtle "updating" overlay on
   * top of the current rows instead of blanking them. Pass `isFetching` here
   * and `isLoading` to `isLoading`.
   */
  busy?: boolean;
  emptyMessage?: string;
  /** When set, a leading checkbox column is rendered for bulk selection. */
  selection?: SelectionConfig;
  /**
   * Infinite scrolling (preferred). When set, the table auto-loads the next
   * batch as the user nears the bottom and shows a loading row — no pager.
   */
  infinite?: InfiniteConfig;
  /** @deprecated Offset pagination — kept only for backward compatibility. */
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

/**
 * A sentinel row observed via IntersectionObserver; when it scrolls into view
 * (and more records exist and none are in flight) it triggers the next batch.
 */
function InfiniteSentinel({
  colSpan,
  infinite,
}: {
  colSpan: number;
  infinite: InfiniteConfig;
}) {
  const ref = useRef<HTMLTableRowElement | null>(null);
  const { hasMore, isFetchingMore, onLoadMore } = infinite;
  // Keep the latest callback without re-subscribing the observer each render.
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingMore) {
          loadMoreRef.current();
        }
      },
      // Prefetch a little before the sentinel is fully visible.
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore]);

  if (!hasMore && !isFetchingMore) return null;

  return (
    <TableRow ref={ref} aria-hidden>
      <TableCell colSpan={colSpan} className="py-4 text-center text-muted-foreground">
        {isFetchingMore ? (
          <span className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading more…
          </span>
        ) : (
          <span className="text-xs">Scroll to load more</span>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Generic, reusable table. Prefer the `infinite` prop (scroll-loaded batches);
 * the offset-pagination props remain only for backward compatibility and are no
 * longer used by inventory pages.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  loadingVariant = 'lottie',
  busy = false,
  emptyMessage = 'No records found.',
  selection,
  infinite,
  page,
  totalPages,
  total,
  onPageChange,
}: DataTableProps<T>) {
  const showPagination =
    !infinite &&
    page != null &&
    totalPages != null &&
    onPageChange != null;

  const selCol = selection ? 1 : 0;
  const colSpan = columns.length + selCol;
  const loadedIds = rows.map(rowKey);
  const allSelected =
    !!selection && loadedIds.length > 0 && loadedIds.every((id) => selection.selectedIds.has(id));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={() => selection.onToggleAll(loadedIds, allSelected)}
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="text-center text-muted-foreground"
              >
                {loadingVariant === 'lottie' ? (
                  <div className="py-6">
                    <LottieLoader size={64} className="py-0" />
                  </div>
                ) : (
                  <span className="block py-8">Loading…</span>
                )}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            <>
              {rows.map((row) => {
                const id = rowKey(row);
                return (
                  <TableRow key={id}>
                    {selection && (
                      <TableCell className="w-8">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={selection.selectedIds.has(id)}
                          onChange={() => selection.onToggle(id)}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {infinite && (
                <InfiniteSentinel colSpan={colSpan} infinite={infinite} />
              )}
            </>
          )}
        </TableBody>
      </Table>

      {showPagination && (
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.max(totalPages!, 1)}
            {total != null ? ` · ${total} total` : ''}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page! <= 1}
              onClick={() => onPageChange!(page! - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page! >= totalPages!}
              onClick={() => onPageChange!(page! + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* "Updating…" overlay while re-querying over already-displayed rows. */}
      <BusyOverlay show={busy && !isLoading} />
    </div>
  );
}
