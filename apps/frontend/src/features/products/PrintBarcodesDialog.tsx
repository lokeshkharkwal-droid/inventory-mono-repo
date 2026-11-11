import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import { openPrintDocumentPost } from '@/lib/print';
import { useProducts } from '@/features/products/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Row {
  productId: string;
  code: string;
  name: string;
  quantity: number;
}

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/**
 * Legacy Products::print_barcodes — pick multiple products, set a quantity per
 * product, choose a label style + fields, and print a sheet of labels. Reuses
 * the product search, the shared Dialog, and the POST print pipeline.
 */
export function PrintBarcodesDialog({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const { data } = useProducts({ page: 1, limit: 20, search });
  const [rows, setRows] = useState<Row[]>([]);
  const [style, setStyle] = useState<'20' | '30' | '40' | '50'>('40');
  const [symbology, setSymbology] = useState<'CODE39' | 'QR'>('CODE39');
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBusinessName, setShowBusinessName] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);

  const add = (p: { id: string; code: string; name: string }) => {
    setRows((prev) =>
      prev.some((r) => r.productId === p.id)
        ? prev
        : [...prev, { productId: p.id, code: p.code, name: p.name, quantity: 1 }],
    );
  };
  const setQty = (id: string, q: number) =>
    setRows((prev) =>
      prev.map((r) => (r.productId === id ? { ...r, quantity: Math.max(1, q) } : r)),
    );
  const remove = (id: string) =>
    setRows((prev) => prev.filter((r) => r.productId !== id));

  const print = async () => {
    if (rows.length === 0) {
      toast.error('Add at least one product.');
      return;
    }
    setBusy(true);
    try {
      const ok = await openPrintDocumentPost('/print/barcodes', {
        items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
        style,
        symbology,
        showName,
        showPrice,
        showBusinessName,
        businessName: businessName || undefined,
      });
      if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not print barcodes'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-y-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Print barcodes</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Product search */}
          <div className="space-y-1.5">
            <Label>Add products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by code or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <div className="max-h-40 overflow-auto rounded-lg border border-border/60">
                {(data?.data ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => add(p)}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span>
                      {p.name}{' '}
                      <span className="text-muted-foreground">({p.code})</span>
                    </span>
                    <Plus className="h-4 w-4" />
                  </button>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No products.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Selected rows */}
          <div className="rounded-lg border border-border/60">
            {rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No products selected yet.
              </p>
            ) : (
              rows.map((r) => (
                <div
                  key={r.productId}
                  className="flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-0"
                >
                  <span className="flex-1 text-sm">
                    {r.name}{' '}
                    <span className="text-muted-foreground">({r.code})</span>
                  </span>
                  <Input
                    type="number"
                    min={1}
                    className="h-9 w-20"
                    value={r.quantity}
                    onChange={(e) => setQty(r.productId, Number(e.target.value))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(r.productId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label style</Label>
              <select
                className={selectCls}
                value={style}
                onChange={(e) =>
                  setStyle(e.target.value as '20' | '30' | '40' | '50')
                }
              >
                <option value="20">Small (20)</option>
                <option value="30">Medium (30)</option>
                <option value="40">Large (40)</option>
                <option value="50">Extra large (50)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Barcode type</Label>
              <select
                className={selectCls}
                value={symbology}
                onChange={(e) =>
                  setSymbology(e.target.value as 'CODE39' | 'QR')
                }
              >
                <option value="CODE39">Barcode (Code 39)</option>
                <option value="QR">QR code</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Business name (optional)</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Printed on each label"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showName}
                  onChange={(e) => setShowName(e.target.checked)}
                />
                Show product name
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                />
                Show price
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                />
                Show business name
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={print} disabled={busy || rows.length === 0}>
            <Printer className="h-4 w-4" /> {busy ? 'Preparing…' : 'Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
