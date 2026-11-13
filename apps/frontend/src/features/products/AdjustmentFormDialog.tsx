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
import { useRecordAdjustment, type AdjustmentInput } from './api';

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

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
                onChange={(e) => set('packSize', e.target.value)}
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
                onChange={(e) => set('packQuantity', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-qty">Quantity</Label>
              <Input
                id="adj-qty"
                type="number"
                step="any"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
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
                onChange={(e) => set('packMrp', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-unit-mrp">Unit MRP</Label>
              <Input
                id="adj-unit-mrp"
                type="number"
                step="any"
                value={form.unitMrp}
                onChange={(e) => set('unitMrp', e.target.value)}
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
