import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, Printer, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import { fetchPrintHtml, printIframe } from '@/lib/print';
import { useProducts } from '@/features/products/api';
import { usePurchase } from '@/features/purchases/api';

interface Row {
  productId: string;
  code: string;
  name: string;
  quantity: number;
}

type Style = '40' | '30' | '24' | '20' | '18' | '14' | '12' | '10';
type Symbology = 'CODE128' | 'CODE39' | 'QR';

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: '40', label: '40 per sheet' },
  { value: '30', label: '30 per sheet' },
  { value: '24', label: '24 per sheet' },
  { value: '20', label: '20 per sheet' },
  { value: '18', label: '18 per sheet' },
  { value: '14', label: '14 per sheet' },
  { value: '12', label: '12 per sheet' },
  { value: '10', label: '10 per sheet' },
];

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/**
 * Legacy Products::print_barcodes — pick products + a per-product quantity,
 * choose a label style (labels-per-sheet) + fields, click Update to render an
 * on-page preview of the exact printed sheets (correct per-sheet count + page
 * breaks), then Print only those sheets. The preview is an iframe fed the
 * server-rendered sheet HTML; printing the iframe never prints page chrome.
 */
export function PrintBarcodes() {
  const [search, setSearch] = useState('');
  const { data } = useProducts({ page: 1, limit: 20, search });
  const [rows, setRows] = useState<Row[]>([]);

  // EZHT: `products/print_barcode?purchase={id}` — prefill the sheet with the
  // purchase's products (quantity = received quantity). Runs once per purchase.
  const [searchParams] = useSearchParams();
  const purchaseId = searchParams.get('purchase');
  const { data: purchase } = usePurchase(purchaseId);
  const prefilledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!purchase || prefilledFor.current === purchase.id) return;
    prefilledFor.current = purchase.id;
    setRows(
      purchase.items.map((it) => ({
        productId: it.productId,
        code: it.productCode ?? '',
        name: it.productName,
        quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
      })),
    );
  }, [purchase]);
  const [style, setStyle] = useState<Style>('24');
  const [symbology, setSymbology] = useState<Symbology>('CODE128');
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showUnit, setShowUnit] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Any change to the inputs makes the current preview stale — clear it so the
  // user re-runs Update (and can't print a sheet that no longer matches).
  useEffect(() => {
    setHtml(null);
  }, [
    rows,
    style,
    symbology,
    showName,
    showPrice,
    showBusinessName,
    showCurrency,
    showUnit,
    showCategory,
    showVariants,
    showImage,
    businessName,
  ]);

  const totalLabels = rows.reduce((n, r) => n + Math.max(1, r.quantity), 0);
  const perSheet = Number(style);
  const pageCount = totalLabels > 0 ? Math.ceil(totalLabels / perSheet) : 0;

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

  const update = async () => {
    if (rows.length === 0) {
      toast.error('Add at least one product.');
      return;
    }
    setBusy(true);
    try {
      const doc = await fetchPrintHtml('/print/barcodes', {
        items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
        style,
        symbology,
        showName,
        showPrice,
        showBusinessName,
        showCurrency,
        showUnit,
        showCategory,
        showVariants,
        showImage,
        businessName: businessName || undefined,
      });
      setHtml(doc);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not generate barcodes'));
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    if (!printIframe(iframeRef.current)) {
      toast.error('Nothing to print — click Update first.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Print Barcodes</h1>
          <p className="text-sm text-muted-foreground">
            Select products and a label style, click Update to preview, then
            print the barcode sheets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={update} disabled={busy || rows.length === 0}>
            <RefreshCw className="h-4 w-4" /> {busy ? 'Generating…' : 'Update'}
          </Button>
          <Button onClick={print} disabled={!html}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Controls */}
        <div className="space-y-4 lg:col-span-2">
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
                onChange={(e) => setStyle(e.target.value as Style)}
              >
                {STYLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Barcode type</Label>
              <select
                className={selectCls}
                value={symbology}
                onChange={(e) => setSymbology(e.target.value as Symbology)}
              >
                <option value="CODE128">Barcode (Code 128)</option>
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showCurrency}
                  onChange={(e) => setShowCurrency(e.target.checked)}
                />
                Show currency
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showUnit}
                  onChange={(e) => setShowUnit(e.target.checked)}
                />
                Show unit
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showCategory}
                  onChange={(e) => setShowCategory(e.target.checked)}
                />
                Show category
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showVariants}
                  onChange={(e) => setShowVariants(e.target.checked)}
                />
                Show variants
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showImage}
                  onChange={(e) => setShowImage(e.target.checked)}
                />
                Show product image
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <Label>Preview</Label>
            {rows.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalLabels} label{totalLabels === 1 ? '' : 's'} · {pageCount} page
                {pageCount === 1 ? '' : 's'} ({perSheet}/sheet)
              </span>
            )}
          </div>
          <div className="h-[70vh] overflow-hidden rounded-lg border border-border/60 bg-muted/30">
            {html ? (
              <iframe
                ref={iframeRef}
                title="Barcode preview"
                srcDoc={html}
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                {rows.length === 0
                  ? 'Add products, then click Update to preview the barcode sheets.'
                  : 'Click Update to generate the barcode sheet preview.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
