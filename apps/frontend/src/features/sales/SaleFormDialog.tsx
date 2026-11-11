import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
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
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import { useCreateSale, useUpdateSale, useSale } from './api';

interface LineRow {
  productId: string;
  productName?: string;
  quantity: string;
  price: string;
  taxRate: string;
  discount: string;
}

interface FormValues {
  customerId: string;
  reference: string;
  date: string;
  status: string;
  orderDiscount: string;
  shipping: string;
  note: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  quantity: '1',
  price: '0',
  taxRate: '0',
  discount: '0',
};

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this sale instead of creating a new one. */
  editId?: string | null;
}

/** Create/edit-sale dialog: customer + line items (qty × price) → outbound stock. */
export function SaleFormDialog({ open, onOpenChange, editId }: Props) {
  const create = useCreateSale();
  const update = useUpdateSale();
  const { data: editing } = useSale(editId ?? null);

  const { register, handleSubmit, control, watch, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      customerId: '',
      reference: '',
      date: '',
      status: 'COMPLETED',
      orderDiscount: '0',
      shipping: '0',
      note: '',
      items: [EMPTY_ROW],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Hydrate the form when editing an existing sale (or reset to blank on close).
  useEffect(() => {
    if (!open) return;
    if (editId && editing) {
      reset({
        customerId: editing.customer?.id ?? '',
        reference: editing.reference ?? '',
        date: editing.date ? editing.date.slice(0, 10) : '',
        status: editing.status,
        orderDiscount: String(editing.orderDiscount ?? 0),
        shipping: String(editing.shipping ?? 0),
        note: editing.note ?? '',
        items: editing.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: String(i.quantity),
          price: String(i.price),
          taxRate: String(i.taxRate ?? 0),
          discount: String(i.discount ?? 0),
        })),
      });
    } else if (!editId) {
      reset({
        customerId: '',
        reference: '',
        date: '',
        status: 'COMPLETED',
        orderDiscount: '0',
        shipping: '0',
        note: '',
        items: [EMPTY_ROW],
      });
    }
  }, [open, editId, editing, reset]);

  const watched = watch('items');
  const grandTotal = useMemo(() => {
    const lines = (watched ?? []).reduce((sum, l) => {
      const base = Number(l.quantity || 0) * Number(l.price || 0) - Number(l.discount || 0);
      const tax = (base * Number(l.taxRate || 0)) / 100;
      return sum + base + tax;
    }, 0);
    return lines + Number(watch('shipping') || 0) - Number(watch('orderDiscount') || 0);
  }, [watched, watch]);

  const submit = handleSubmit(async (v) => {
    const payload: Record<string, unknown> = {
      customerId: v.customerId,
      reference: v.reference || undefined,
      date: v.date || undefined,
      status: v.status,
      orderDiscount: Number(v.orderDiscount || 0),
      shipping: Number(v.shipping || 0),
      note: v.note || undefined,
      items: v.items
        .filter((i) => i.productId)
        .map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity || 0),
          price: Number(i.price || 0),
          taxRate: Number(i.taxRate || 0),
          discount: Number(i.discount || 0),
        })),
    };
    if ((payload.items as unknown[]).length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, input: payload });
        toast.success('Sale updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Sale created');
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, editId ? 'Could not update sale' : 'Could not create sale'),
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit sale' : 'New sale'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerId">Customer</Label>
              <Controller
                control={control}
                name="customerId"
                rules={{ required: true }}
                render={({ field }) => (
                  <InfiniteSelect
                    value={field.value}
                    onChange={field.onChange}
                    queryKey={['customers']}
                    path="/customers"
                    getOptionValue={(c) => c.id}
                    getOptionLabel={(c) => c.name}
                    selectedLabel={editing?.customer?.name}
                    placeholder="Select customer…"
                  />
                )}
              />
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
                <option value="COMPLETED">Completed (removes stock)</option>
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
                <Controller
                  control={control}
                  name={`items.${i}.productId`}
                  render={({ field }) => (
                    <InfiniteSelect
                      value={field.value}
                      onChange={field.onChange}
                      onSelect={(p) => setValue(`items.${i}.productName`, p.name)}
                      queryKey={['products']}
                      path="/products"
                      getOptionValue={(p) => p.id}
                      getOptionLabel={(p) => p.name}
                      selectedLabel={watch(`items.${i}.productName`)}
                      placeholder="Select product…"
                    />
                  )}
                />
                <Input placeholder="Qty" type="number" step="any" {...register(`items.${i}.quantity`)} />
                <Input placeholder="Price" type="number" step="any" {...register(`items.${i}.price`)} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
