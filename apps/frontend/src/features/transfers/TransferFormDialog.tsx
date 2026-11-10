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
import { useBranchOptions } from '@/features/_shared/branches';
import { useProducts } from '@/features/products/api';
import { useCreateTransfer } from './api';

interface LineRow {
  productId: string;
  quantity: string;
}

interface FormValues {
  fromBranchId: string;
  toBranchId: string;
  reference: string;
  date: string;
  note: string;
  items: LineRow[];
}

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Create-transfer dialog: source + destination branch + line items (qty). */
export function TransferFormDialog({ open, onOpenChange }: Props) {
  const create = useCreateTransfer();
  const { data: branches } = useBranchOptions();
  const { data: products } = useProducts({ page: 1, limit: 200 });

  const branchOptions = useMemo(() => branches ?? [], [branches]);
  const productOptions = useMemo(() => products?.data ?? [], [products]);

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: {
      fromBranchId: '',
      toBranchId: '',
      reference: '',
      date: '',
      note: '',
      items: [{ productId: '', quantity: '1' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const submit = handleSubmit(async (v) => {
    const items = v.items
      .filter((i) => i.productId)
      .map((i) => ({ productId: i.productId, quantity: Number(i.quantity || 0) }));
    if (items.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    if (v.fromBranchId === v.toBranchId) {
      toast.error('Source and destination must differ.');
      return;
    }
    try {
      await create.mutateAsync({
        fromBranchId: v.fromBranchId,
        toBranchId: v.toBranchId,
        reference: v.reference || undefined,
        date: v.date || undefined,
        note: v.note || undefined,
        items,
      });
      toast.success('Transfer created');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create transfer'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fromBranchId">From branch</Label>
              <select id="fromBranchId" className={selectCls} {...register('fromBranchId', { required: true })}>
                <option value="">—</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toBranchId">To branch</Label>
              <select id="toBranchId" className={selectCls} {...register('toBranchId', { required: true })}>
                <option value="">—</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
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
              <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: '1' })}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[3fr_1fr_auto] gap-2">
                <select className={selectCls} {...register(`items.${i}.productId`)}>
                  <option value="">Select product…</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Input placeholder="Qty" type="number" step="any" {...register(`items.${i}.quantity`)} />
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
