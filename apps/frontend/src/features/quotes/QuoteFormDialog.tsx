import { useState } from 'react';
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
import { useCreateQuote } from './api';

interface LineRow {
  productId: string;
  productName?: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
}

interface FormValues {
  type: 'SALE' | 'PURCHASE';
  customerId: string;
  supplierId: string;
  reference: string;
  date: string;
  note: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  quantity: '1',
  unitPrice: '0',
  taxRate: '0',
  discount: '0',
};

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Create-quote dialog (sales or purchase) with line items. */
export function QuoteFormDialog({ open, onOpenChange }: Props) {
  const create = useCreateQuote();
  const [type, setType] = useState<'SALE' | 'PURCHASE'>('SALE');

  const { register, handleSubmit, control, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      type: 'SALE',
      customerId: '',
      supplierId: '',
      reference: '',
      date: '',
      note: '',
      items: [EMPTY_ROW],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const submit = handleSubmit(async (v) => {
    const items = v.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity || 0),
        unitPrice: Number(i.unitPrice || 0),
        taxRate: Number(i.taxRate || 0),
        discount: Number(i.discount || 0),
      }));
    if (items.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    try {
      await create.mutateAsync({
        type: v.type,
        customerId: v.type === 'SALE' ? v.customerId : undefined,
        supplierId: v.type === 'PURCHASE' ? v.supplierId : undefined,
        reference: v.reference || undefined,
        date: v.date || undefined,
        note: v.note || undefined,
        items,
      });
      toast.success('Quote created');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create quote'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className={selectCls}
                {...register('type', {
                  onChange: (e) => setType(e.target.value as 'SALE' | 'PURCHASE'),
                })}
              >
                <option value="SALE">Sales quote</option>
                <option value="PURCHASE">Purchase quote</option>
              </select>
            </div>
            {type === 'SALE' ? (
              <div className="space-y-1.5">
                <Label htmlFor="customerId">Customer</Label>
                <Controller
                  control={control}
                  name="customerId"
                  render={({ field }) => (
                    <InfiniteSelect
                      id="customerId"
                      value={field.value}
                      onChange={field.onChange}
                      queryKey={['customers']}
                      path="/customers"
                      getOptionValue={(c) => c.id}
                      getOptionLabel={(c) => c.name}
                      placeholder="Select customer…"
                      clearable
                    />
                  )}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="supplierId">Supplier</Label>
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <InfiniteSelect
                      id="supplierId"
                      value={field.value}
                      onChange={field.onChange}
                      queryKey={['suppliers']}
                      path="/suppliers"
                      getOptionValue={(s) => s.id}
                      getOptionLabel={(s) => s.name}
                      placeholder="Select supplier…"
                      clearable
                    />
                  )}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" placeholder="Auto if blank" {...register('reference')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
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
                      selectedLabel={watch(`items.${i}.productName`)}
                      queryKey={['products']}
                      path="/products"
                      getOptionValue={(p) => p.id}
                      getOptionLabel={(p) => p.name}
                      placeholder="Select product…"
                    />
                  )}
                />
                <Input placeholder="Qty" type="number" step="any" {...register(`items.${i}.quantity`)} />
                <Input placeholder="Price" type="number" step="any" {...register(`items.${i}.unitPrice`)} />
                <Input placeholder="Tax %" type="number" step="any" {...register(`items.${i}.taxRate`)} />
                <Input placeholder="Disc" type="number" step="any" {...register(`items.${i}.discount`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Input id="note" {...register('note')} />
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
