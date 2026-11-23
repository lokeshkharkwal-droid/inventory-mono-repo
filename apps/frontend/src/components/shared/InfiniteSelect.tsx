/* eslint-disable @typescript-eslint/no-explicit-any -- the option accessors are
   intentionally row-agnostic so every resource can pass unannotated callbacks
   (e.g. `(c) => c.id`) without per-call-site generics. This is a reusable,
   resource-agnostic select primitive. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // The panel is rendered in a portal on `document.body` (not inside the form's
  // scroll/overflow containers), so it is never clipped by an ancestor's
  // `overflow` and always paints above surrounding content. We track the
  // trigger's viewport rect to position the fixed panel, flipping it above the
  // trigger when there isn't room below (e.g. opened near the page bottom).
  const [coords, setCoords] = useState<{
    left: number;
    width: number;
    top: number;
    openUp: boolean;
  } | null>(null);

  /** Estimated panel height (search box + list) used for the flip decision. */
  const PANEL_MAX_HEIGHT = 320;

  const updateCoords = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < PANEL_MAX_HEIGHT && r.top > spaceBelow;
    setCoords({
      left: r.left,
      width: r.width,
      top: openUp ? r.top : r.bottom,
      openUp,
    });
  }, []);

  // `silent` keeps option fetches off the global loading overlay — the dropdown
  // renders its own inline spinner, so a filter dropdown must not flash the
  // full-screen loader while loading/searching options.
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } = useInfiniteList<any>(
    queryKey,
    path,
    { search, extra, enabled: open, silent: true },
  );

  // Resolve the label to show on the trigger for the current value.
  const currentLabel = useMemo(() => {
    if (!value) return '';
    const match = rows.find((r) => getOptionValue(r) === value);
    if (match) return getOptionLabel(match);
    return selectedLabel ?? value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rows, selectedLabel]);

  // Close on outside click. The panel lives in a portal outside `rootRef`, so
  // clicks inside it must also count as "inside".
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // While open, keep the portaled panel aligned to the trigger. `scroll` is
  // captured so the panel also follows when an ancestor container scrolls.
  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updateCoords();
    const onReflow = () => updateCoords();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, updateCoords]);

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

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              left: coords.left,
              width: coords.width,
              ...(coords.openUp
                ? { bottom: window.innerHeight - coords.top + 4 }
                : { top: coords.top + 4 }),
            }}
            className="z-50 rounded-md border border-border bg-background shadow-md"
          >
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
          </div>,
          document.body,
        )}
    </div>
  );
}
