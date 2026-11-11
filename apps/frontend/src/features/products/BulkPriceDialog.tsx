import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import { useInfiniteProducts, useBulkPrice } from '@/features/products/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Edit {
  price: string;
  cost: string;
}

/** Bulk price/cost update across products (legacy Products::update_price). */
export function BulkPriceDialog({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const { rows, hasMore, isFetchingMore, fetchMore } = useInfiniteProducts({ search });
  const bulk = useBulkPrice();
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!open) {
      setEdits({});
      setSearch('');
    }
  }, [open]);

  // Infinite scroll inside the product table.
  useEffect(() => {
    if (!open || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingMore) fetchMore();
      },
      { rootMargin: '120px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, hasMore, isFetchingMore, fetchMore]);

  const setEdit = (id: string, patch: Partial<Edit>) =>
    setEdits((prev) => ({
      ...prev,
      [id]: { price: '', cost: '', ...prev[id], ...patch },
    }));

  const submit = async () => {
    const items = Object.entries(edits)
      .map(([id, e]) => ({
        id,
        price: e.price !== '' ? Number(e.price) : undefined,
        cost: e.cost !== '' ? Number(e.cost) : undefined,
      }))
      .filter((i) => i.price != null || i.cost != null);
    if (items.length === 0) {
      toast.error('Enter at least one new price or cost.');
      return;
    }
    try {
      const res = await bulk.mutateAsync(items);
      toast.success(`Updated ${res.updated} product(s)`);
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Bulk update failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk price update</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-80 overflow-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 w-28">Current</th>
                  <th className="px-3 py-2 w-28">New price</th>
                  <th className="px-3 py-2 w-28">New cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-1.5">
                      {p.name}{' '}
                      <span className="text-muted-foreground">({p.code})</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {p.price.toFixed(2)}
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        step="any"
                        className="h-8"
                        value={edits[p.id]?.price ?? ''}
                        onChange={(e) => setEdit(p.id, { price: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        step="any"
                        className="h-8"
                        value={edits[p.id]?.cost ?? ''}
                        onChange={(e) => setEdit(p.id, { cost: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No products.
                    </td>
                  </tr>
                )}
                {hasMore && (
                  <tr ref={sentinelRef} aria-hidden>
                    <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">
                      {isFetchingMore && (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading more…
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={bulk.isPending}>
            {bulk.isPending ? 'Saving…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
