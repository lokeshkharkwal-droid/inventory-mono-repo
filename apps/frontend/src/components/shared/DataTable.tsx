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
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/** A single column definition for the generic DataTable. */
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
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
  isLoading?: boolean;
  emptyMessage?: string;
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
  emptyMessage = 'No records found.',
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

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
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
                colSpan={columns.length}
                className="py-8 text-center text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            <>
              {rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {infinite && (
                <InfiniteSentinel colSpan={columns.length} infinite={infinite} />
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
    </div>
  );
}
