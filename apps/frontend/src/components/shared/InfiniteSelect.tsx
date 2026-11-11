/* eslint-disable @typescript-eslint/no-explicit-any -- the option accessors are
   intentionally row-agnostic so every resource can pass unannotated callbacks
   (e.g. `(c) => c.id`) without per-call-site generics. This is a reusable,
   resource-agnostic select primitive. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, Loader2, Check, X } from 'lucide-react';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';
import { cn } from '@/lib/utils';

export interface InfiniteSelectProps {
  /** Currently-selected value (an id), or '' for none. */
  value: string;
  /** Called with the chosen id (or '' when cleared). */
  onChange: (value: string) => void;
  /** Also called with the full chosen row (e.g. to capture its label). */
  onSelect?: (row: any) => void;
  /** Stable query-key prefix for the source resource, e.g. `['products']`. */
  queryKey: readonly unknown[];
  /** API path, e.g. `/products`. */
  path: string;
  /** Map a loaded row to its option value (id). */
  getOptionValue: (row: any) => string;
  /** Map a loaded row to its option label. */
  getOptionLabel: (row: any) => string;
  /** Extra query params (filters) forwarded to the list + included in the key. */
  extra?: Record<string, string | number | boolean | undefined>;
  /**
   * Label for the currently-selected value so it shows even when that record
   * isn't in the loaded pages (e.g. when editing). Falls back to the value.
   */
  selectedLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Allow clearing the selection back to ''. */
  clearable?: boolean;
  className?: string;
  id?: string;
}

const triggerCls =
  'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';

/**
 * A searchable, infinitely-scrolling single-select combobox — the drop-in
 * replacement for native `<select>`s that loaded whole collections with a large
 * limit. Types-to-search server-side and loads options in batches as the list
 * scrolls, so no record cap is needed. Integrate with react-hook-form via
 * `Controller` (value/onChange).
 */
export function InfiniteSelect({
  value,
  onChange,
  onSelect,
  queryKey,
  path,
  getOptionValue,
  getOptionLabel,
  extra,
  selectedLabel,
  placeholder = 'Select…',
  disabled,
  clearable,
  className,
  id,
}: InfiniteSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } = useInfiniteList<any>(
    queryKey,
    path,
    { search, extra, enabled: open },
  );

  // Resolve the label to show on the trigger for the current value.
  const currentLabel = useMemo(() => {
    if (!value) return '';
    const match = rows.find((r) => getOptionValue(r) === value);
    if (match) return getOptionLabel(match);
    return selectedLabel ?? value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rows, selectedLabel]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Infinite scroll inside the dropdown panel.
  useEffect(() => {
    if (!open || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingMore) fetchMore();
      },
      { root: el.parentElement, rootMargin: '120px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, hasMore, isFetchingMore, fetchMore]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={triggerCls}
      >
        <span className={cn('truncate', !currentLabel && 'text-muted-foreground')}>
          {currentLabel || placeholder}
        </span>
        <span className="flex items-center gap-1">
          {clearable && value && !disabled && (
            <X
              className="h-4 w-4 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md">
          <div className="border-b p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full rounded border border-input bg-background px-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No results.
              </div>
            ) : (
              <>
                {rows.map((row) => {
                  const v = getOptionValue(row);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        onChange(v);
                        onSelect?.(row);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent',
                        v === value && 'bg-accent/50',
                      )}
                    >
                      <span className="truncate">{getOptionLabel(row)}</span>
                      {v === value && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
                <div ref={sentinelRef} aria-hidden>
                  {isFetchingMore && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading more…
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
