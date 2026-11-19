import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { Barcode, Loader2 } from 'lucide-react';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';
import type { ProductListRow } from '@/features/products/api';
import { cn } from '@/lib/utils';

/** Wait this long after the last keystroke before searching. */
const SEARCH_DEBOUNCE_MS = 250;

/** Muted status row in the dropdown (searching / no results / loading more). */
const STATUS = 'flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500';

/** `Name (Code)` — the legacy autocomplete label. */
function productLabel(p: ProductListRow): string {
  return p.code ? `${p.name} (${p.code})` : p.name;
}

interface Props {
  /** Called with the chosen product; the caller adds it to the order items. */
  onAdd: (product: ProductListRow) => void;
}

/**
 * Legacy "Please add products to order list" box (EZHT / SMA `#add_item`): a
 * barcode-addon search input whose autocomplete lists matching products as
 * `Name (Code)`. Picking one (click, or Enter on the highlighted match) hands it
 * to `onAdd` and clears the box, ready for the next product. Enter typed before
 * the results arrive (a barcode scanner types the code + Enter instantly) adds
 * the first match once they load. Enter never submits the surrounding form.
 *
 * Searches the same `/products` list (and cache key) as the app's product
 * pickers, server-side, loading more results as the menu scrolls.
 */
export function ProductSearchAdd({ onAdd }: Props) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;
  /** Enter was pressed before the results for the typed text arrived. */
  const pendingEnterRef = useRef(false);
  const listId = useId();

  useEffect(() => {
    const t = window.setTimeout(
      () => setSearch(text.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [text]);

  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteList<ProductListRow>(['products'], '/products', {
      search,
      enabled: search.length > 0,
      silent: true,
    });

  /** True once the results on screen belong to what's typed in the box. */
  const settled = search === text.trim() && !isLoading;

  // New results → highlight the first match again.
  useEffect(() => setActive(0), [search]);

  // Close the menu on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (product: ProductListRow) => {
    pendingEnterRef.current = false;
    onAddRef.current(product);
    setText('');
    setSearch('');
    setOpen(false);
    inputRef.current?.focus();
  };

  // Scanner-style Enter: add the first match as soon as its results arrive.
  useEffect(() => {
    if (!pendingEnterRef.current || !settled || !search) return;
    pendingEnterRef.current = false;
    const first = rows[0];
    if (first) choose(first);
  }, [settled, search, rows]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter': {
        e.preventDefault(); // never submit the proforma form from here
        if (!text.trim()) return;
        const row = rows[active];
        if (settled && row) choose(row);
        else {
          pendingEnterRef.current = true;
          setOpen(true);
        }
        return;
      }
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setActive((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case 'Tab':
        setOpen(false);
        return;
    }
  };

  const onMenuScroll = (e: UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    if (
      hasMore &&
      !isFetchingMore &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    ) {
      fetchMore();
    }
  };

  const showMenu = open && text.trim().length > 0;
  const activeRow = settled ? rows[active] : undefined;

  return (
    <div ref={rootRef} className="relative w-full">
      <Barcode
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
      <div>
        <input
          ref={inputRef}
          type="text"
          className="flex h-10 w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-xs transition-colors placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
          placeholder="Please add products to order list"
          aria-label="Search products to add to the order list"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showMenu}
          aria-controls={listId}
          aria-activedescendant={activeRow ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            pendingEnterRef.current = false;
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {showMenu && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-md"
            onScroll={onMenuScroll}
          >
            {!settled ? (
              <li className={STATUS}>
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </li>
            ) : rows.length === 0 ? (
              <li className={STATUS}>No matching products</li>
            ) : (
              <>
                {rows.map((p, i) => (
                  <li
                    key={p.id}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-sm text-gray-700',
                      i === active && 'bg-blue-50 text-blue-900',
                    )}
                    onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(p)}
                  >
                    {productLabel(p)}
                  </li>
                ))}
                {isFetchingMore && (
                  <li className={STATUS}>
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading more…
                  </li>
                )}
              </>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
