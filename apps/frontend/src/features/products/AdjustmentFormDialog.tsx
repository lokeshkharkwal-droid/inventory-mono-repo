import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import {
  useRecordAdjustment,
  useProduct,
  useProductBatches,
  type AdjustmentInput,
  type ProductBatch,
} from './api';

interface Props {
  productId?: string;
  productName?: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type AdjustmentType = 'Addition' | 'Subtraction';

const EMPTY = {
  pickedId: '',
  pickedLabel: '',
  batchId: '',
  variantId: '',
  adjustedAt: '',
  type: 'Addition' as AdjustmentType,
  packSize: '',
  packQuantity: '',
  quantity: '',
  batchNo: '',
  expiryDate: '',
  packMrp: '',
  unitMrp: '',
  cost: '',
  reason: '',
  note: '',
};

/** Format a batch as an EZHT "Purchased Item" option label: Batch · Exp · Qty. */
function batchLabel(b: ProductBatch): string {
  const parts: string[] = [];
  if (b.batchNo) parts.push(`Batch: ${b.batchNo}`);
  if (b.expiryDate) parts.push(`Exp: ${b.expiryDate.slice(0, 10)}`);
  parts.push(`Qty: ${b.quantity}`);
  return parts.join(' · ');
}

/** Convert a date-input value (yyyy-mm-dd) to an ISO instant, or undefined. */
function toIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Parse a numeric input into a finite number, or undefined when blank/invalid. */
function toNum(str: string): number | undefined {
  if (str.trim() === '') return undefined;
  const n = Number(str);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Full EZHT quantity-adjustment form. When no `productId` is given it shows a
 * product picker (for the Quantity Adjustments page); otherwise it operates on
 * the supplied product. Sends a signed `quantity` delta based on the type.
 */
export function AdjustmentFormDialog({
  productId,
  productName,
  open,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState(EMPTY);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const resolvedProductId = productId ?? form.pickedId;
  const record = useRecordAdjustment(resolvedProductId);
  const { data: productDetail } = useProduct(resolvedProductId || null);
  const variants = productDetail?.variants ?? [];

  // "Purchased Items" — the product's open batches at the active branch
  // (= warehouse), including expired, mirroring EZHT's getPurchasedItemsBySerial.
  const { data: batches } = useProductBatches(resolvedProductId || null, true);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toDec = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = (n: number) =>
    Number.isFinite(n) ? String(Math.round(n * 10000) / 10000) : '';

  // EZHT pack math: packSize × packQuantity → quantity.
  const onPackSizeOrQty = (packSize: string, packQuantity: string) => {
    const qty = toDec(packSize) * toDec(packQuantity);
    setForm((p) => ({ ...p, packSize, packQuantity, quantity: fmt(qty) }));
  };
  // quantity → packQuantity (only when evenly divisible by packSize).
  const onQuantity = (quantity: string) => {
    const size = toDec(form.packSize);
    const q = toDec(quantity);
    const pq = size > 0 && q > 0 && q % size === 0 ? q / size : 0;
    setForm((p) => ({ ...p, quantity, packQuantity: pq ? fmt(pq) : p.packQuantity }));
  };
  // packMrp → unitMrp = packMrp / packSize.
  const onPackMrp = (packMrp: string) => {
    const size = toDec(form.packSize);
    const unit = size > 0 ? toDec(packMrp) / size : 0;
    setForm((p) => ({ ...p, packMrp, unitMrp: size > 0 ? fmt(unit) : p.unitMrp }));
  };
  // unitMrp → packMrp = unitMrp × packSize.
  const onUnitMrp = (unitMrp: string) => {
    const size = toDec(form.packSize);
    setForm((p) => ({
      ...p,
      unitMrp,
      packMrp: size > 0 ? fmt(toDec(unitMrp) * size) : p.packMrp,
    }));
  };

  // Selecting a Purchased Item fills batch/expiry/qty/MRP, exactly like EZHT.
  const onPickBatch = (batchId: string) => {
    const b = (batches ?? []).find((x) => x.id === batchId);
    if (!b) {
      setForm((p) => ({ ...p, batchId: '' }));
      return;
    }
    setForm((p) => ({
      ...p,
      batchId,
      batchNo: b.batchNo ?? '',
      expiryDate: b.expiryDate ? b.expiryDate.slice(0, 10) : '',
      quantity: fmt(b.quantity),
      cost: b.cost != null ? fmt(b.cost) : p.cost,
      unitMrp: b.cost != null ? fmt(b.cost) : p.unitMrp,
    }));
  };

  const onSubmit = async () => {
    if (!resolvedProductId) {
      toast.error('Select a product.');
      return;
    }
    const magnitude = Math.abs(Number(form.quantity));
    if (!magnitude || Number.isNaN(magnitude)) {
      toast.error('Enter a non-zero quantity.');
      return;
    }

    const signedQuantity =
      (form.type === 'Subtraction' ? -1 : 1) * magnitude;

    const input: AdjustmentInput = {
      quantity: signedQuantity,
      batchId: form.batchId || undefined,
      variantId: form.variantId || undefined,
      adjustedAt: toIso(form.adjustedAt),
      packSize: form.packSize.trim() || undefined,
      packQuantity: toNum(form.packQuantity),
      batchNo: form.batchNo.trim() || undefined,
      expiryDate: toIso(form.expiryDate),
      packMrp: toNum(form.packMrp),
      unitMrp: toNum(form.unitMrp),
      cost: toNum(form.cost),
      reason: form.reason.trim() || undefined,
      note: form.note.trim() || undefined,
    };

    try {
      await record.mutateAsync(input);
      toast.success('Adjustment recorded');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record adjustment'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quantity Adjustment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {productId ? (
            <div className="space-y-1.5">
              <Label>Product</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                {productName ?? resolvedProductId}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="adj-product">Product</Label>
              <InfiniteSelect
                id="adj-product"
                value={form.pickedId}
                selectedLabel={form.pickedLabel}
                onChange={(v) => set('pickedId', v)}
                onSelect={(row: { name?: string }) =>
                  set('pickedLabel', row?.name ?? '')
                }
                queryKey={['products']}
                path="/products"
                getOptionValue={(row: { id: string }) => row.id}
                getOptionLabel={(row: { name: string }) => row.name}
                placeholder="Select a product…"
                clearable
              />
            </div>
          )}

          {variants.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="adj-variant">Variant</Label>
              <select
                id="adj-variant"
                value={form.variantId}
                onChange={(e) => set('variantId', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Base product (no variant) —</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(batches?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="adj-purchased-item">Purchased Items</Label>
              <select
                id="adj-purchased-item"
                value={form.batchId}
                onChange={(e) => onPickBatch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Select a purchased item —</option>
                {(batches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {batchLabel(b)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adj-date">Date</Label>
              <Input
                id="adj-date"
                type="date"
                value={form.adjustedAt}
                onChange={(e) => set('adjustedAt', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-type">Type</Label>
              <select
                id="adj-type"
                value={form.type}
                onChange={(e) => set('type', e.target.value as AdjustmentType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Addition">Addition</option>
                <option value="Subtraction">Subtraction</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-pack-size">Pack size</Label>
              <Input
                id="adj-pack-size"
                value={form.packSize}
                onChange={(e) => onPackSizeOrQty(e.target.value, form.packQuantity)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-pack-qty">Pack quantity</Label>
              <Input
                id="adj-pack-qty"
                type="number"
                step="any"
                value={form.packQuantity}
                onChange={(e) => onPackSizeOrQty(form.packSize, e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-qty">Quantity</Label>
              <Input
                id="adj-qty"
                type="number"
                step="any"
                value={form.quantity}
                onChange={(e) => onQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Unit quantity = pack size × pack quantity
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-batch">Batch no</Label>
              <Input
                id="adj-batch"
                value={form.batchNo}
                onChange={(e) => set('batchNo', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-expiry">Expiry</Label>
              <Input
                id="adj-expiry"
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-pack-mrp">Pack MRP</Label>
              <Input
                id="adj-pack-mrp"
                type="number"
                step="any"
                value={form.packMrp}
                onChange={(e) => onPackMrp(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-unit-mrp">Unit MRP</Label>
              <Input
                id="adj-unit-mrp"
                type="number"
                step="any"
                value={form.unitMrp}
                onChange={(e) => onUnitMrp(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-cost">Cost</Label>
              <Input
                id="adj-cost"
                type="number"
                step="any"
                value={form.cost}
                onChange={(e) => set('cost', e.target.value)}
                placeholder="Unit cost (additions)"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="adj-reason">Reason</Label>
              <Input
                id="adj-reason"
                value={form.reason}
                onChange={(e) => set('reason', e.target.value)}
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="adj-note">Note</Label>
              <textarea
                id="adj-note"
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs"
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={record.isPending}>
              {record.isPending ? 'Saving…' : 'Save adjustment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
