import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { useBatchSearch, type BatchSearchRow } from '@/features/products/api';

/** Short label for a batch-search row: Name · Batch · Expiry · Qty (signed). */
function rowLabel(r: BatchSearchRow): string {
  const batch = r.batchNo || r.serialNo || 'No batch';
  const exp = r.expiryDate ? r.expiryDate.slice(0, 10) : 'no expiry';
  return `${r.productName} · Batch ${batch} · Exp ${exp} · Qty ${r.quantity}`;
}

/**
 * The Add-Sale product autocomplete (EZHT parity): search by product name/code,
 * the dropdown lists ONE ROW PER BATCH (Name · Batch · Expiry · Qty, negatives
 * preserved). Picking a row reports the full batch row up so the order line is
 * populated with that exact batch locked.
 *
 * The menu is rendered in a portal pinned to the input (fixed position, high
 * z-index) so it floats ABOVE the Order Items container instead of being clipped
 * by its scroll/overflow (fixes the legacy z-index bug, §1.9).
 */
export function BatchSearchSelect({
  value,
  warehouseId,
  onPick,
  placeholder = 'Search product…',
}: {
  /** The current line's product display label (shown when collapsed). */
  value: string;
  warehouseId?: string | null;
  onPick: (row: BatchSearchRow) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Debounce the term so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  const { data: rows, isFetching } = useBatchSearch(debounced, warehouseId);

  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 320) });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !inputRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const reflow = () => place();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open]);

  const pick = (r: BatchSearchRow) => {
    onPick(r);
    setOpen(false);
    setTerm('');
  };

  return (
    <div className="min-w-[200px]">
      <Input
        ref={inputRef}
        className="h-9"
        value={open ? term : value}
        placeholder={value || placeholder}
        onFocus={() => {
          setTerm('');
          setOpen(true);
        }}
        onChange={(e) => {
          setTerm(e.target.value);
          if (!open) setOpen(true);
        }}
      />

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 1000,
            }}
            className="max-h-72 overflow-auto rounded-md border border-border bg-background py-1 text-sm shadow-lg"
          >
            {debounced.trim().length === 0 ? (
              <p className="px-3 py-2 text-muted-foreground">
                Type to search products…
              </p>
            ) : isFetching && !rows ? (
              <p className="px-3 py-2 text-muted-foreground">Searching…</p>
            ) : (rows ?? []).length === 0 ? (
              <p className="px-3 py-2 text-muted-foreground">No batches found.</p>
            ) : (
              (rows ?? []).map((r) => (
                <button
                  key={r.batchId}
                  type="button"
                  onClick={() => pick(r)}
                  className="block w-full px-3 py-1.5 text-left hover:bg-accent"
                >
                  {rowLabel(r)}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
