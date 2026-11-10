import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import { supplierHooks } from '@/features/suppliers/api';
import { useProducts } from '@/features/products/api';
import { useCreatePurchase } from './api';

interface LineRow {
  productId: string;
  quantity: string;
  cost: string;
  taxRate: string;
  discount: string;
}

interface FormValues {
  supplierId: string;
  reference: string;
  date: string;
  status: string;
  orderDiscount: string;
  shipping: string;
  note: string;
  isBloodDonation: boolean;
  donorName: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  quantity: '1',
  cost: '0',
  taxRate: '0',
  discount: '0',
};

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Create-purchase dialog: supplier + line items (qty × cost) → inbound stock. */
export function PurchaseFormDialog({ open, onOpenChange }: Props) {
  const create = useCreatePurchase();
  const { data: suppliers } = supplierHooks.useList({ page: 1, limit: 200 });
  const { data: products } = useProducts({ page: 1, limit: 200 });

  const supplierOptions = useMemo(
    () => (suppliers?.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    [suppliers],
  );
  const productOptions = useMemo(
    () => products?.data ?? [],
    [products],
  );

  const { register, handleSubmit, control, watch, reset } = useForm<FormValues>({
    defaultValues: {
      supplierId: '',
      reference: '',
      date: '',
      status: 'RECEIVED',
      orderDiscount: '0',
      shipping: '0',
      note: '',
      isBloodDonation: false,
      donorName: '',
      items: [EMPTY_ROW],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watched = watch('items');
  const grandTotal = useMemo(() => {
    const lines = (watched ?? []).reduce((sum, l) => {
      const base = Number(l.quantity || 0) * Number(l.cost || 0) - Number(l.discount || 0);
      const tax = (base * Number(l.taxRate || 0)) / 100;
      return sum + base + tax;
    }, 0);
    return lines + Number(watch('shipping') || 0) - Number(watch('orderDiscount') || 0);
  }, [watched, watch]);

  const submit = handleSubmit(async (v) => {
    const payload: Record<string, unknown> = {
      supplierId: v.supplierId,
      reference: v.reference || undefined,
      date: v.date || undefined,
      status: v.status,
      orderDiscount: Number(v.orderDiscount || 0),
      shipping: Number(v.shipping || 0),
      note: v.note || undefined,
      isBloodDonation: v.isBloodDonation,
      donorName: v.isBloodDonation ? v.donorName || undefined : undefined,
      items: v.items
        .filter((i) => i.productId)
        .map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity || 0),
          cost: Number(i.cost || 0),
          taxRate: Number(i.taxRate || 0),
          discount: Number(i.discount || 0),
        })),
    };
    if ((payload.items as unknown[]).length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    try {
      await create.mutateAsync(payload);
      toast.success('Purchase created');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create purchase'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="supplierId">Supplier</Label>
              <select id="supplierId" className={selectCls} {...register('supplierId', { required: true })}>
                <option value="">—</option>
                {supplierOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" placeholder="Auto if blank" {...register('reference')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" className={selectCls} {...register('status')}>
                <option value="RECEIVED">Received (adds stock)</option>
                <option value="ORDERED">Ordered</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_ROW)}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2">
                <select className={selectCls} {...register(`items.${i}.productId`)}>
                  <option value="">Select product…</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Input placeholder="Qty" type="number" step="any" {...register(`items.${i}.quantity`)} />
                <Input placeholder="Cost" type="number" step="any" {...register(`items.${i}.cost`)} />
                <Input placeholder="Tax %" type="number" step="any" {...register(`items.${i}.taxRate`)} />
                <Input placeholder="Disc" type="number" step="any" {...register(`items.${i}.discount`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="orderDiscount">Order discount</Label>
              <Input id="orderDiscount" type="number" step="any" {...register('orderDiscount')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shipping">Shipping</Label>
              <Input id="shipping" type="number" step="any" {...register('shipping')} />
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-sm text-muted-foreground">Grand total</span>
              <span className="text-lg font-semibold">{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Input id="note" {...register('note')} />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" {...register('isBloodDonation')} />
              Blood-donation purchase
            </label>
            {watch('isBloodDonation') && (
              <div className="space-y-1.5">
                <Label htmlFor="donorName">Donor name</Label>
                <Input id="donorName" {...register('donorName')} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
