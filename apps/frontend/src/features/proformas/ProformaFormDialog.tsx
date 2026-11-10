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
import { customerHooks } from '@/features/customers/api';
import { useProducts } from '@/features/products/api';
import { useCreateProforma } from './api';

interface LineRow {
  productId: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
}
interface LabRow {
  name: string;
  price: string;
  type: string;
}

interface FormValues {
  customerId: string;
  reference: string;
  date: string;
  note: string;
  items: LineRow[];
  labTests: LabRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
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

/** Create-proforma dialog: customer + product lines + optional lab/radiology lines. */
export function ProformaFormDialog({ open, onOpenChange }: Props) {
  const create = useCreateProforma();
  const { data: customers } = customerHooks.useList({ page: 1, limit: 200 });
  const { data: products } = useProducts({ page: 1, limit: 200 });

  const customerOptions = useMemo(() => customers?.data ?? [], [customers]);
  const productOptions = useMemo(() => products?.data ?? [], [products]);

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: {
      customerId: '',
      reference: '',
      date: '',
      note: '',
      items: [EMPTY_ROW],
      labTests: [],
    },
  });
  const items = useFieldArray({ control, name: 'items' });
  const labs = useFieldArray({ control, name: 'labTests' });

  const submit = handleSubmit(async (v) => {
    const productItems = v.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity || 0),
        unitPrice: Number(i.unitPrice || 0),
        taxRate: Number(i.taxRate || 0),
        discount: Number(i.discount || 0),
      }));
    if (productItems.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    const labTests = v.labTests
      .filter((l) => l.name)
      .map((l) => ({
        name: l.name,
        price: Number(l.price || 0),
        type: l.type || 'LAB_TEST',
      }));
    try {
      await create.mutateAsync({
        customerId: v.customerId || undefined,
        reference: v.reference || undefined,
        date: v.date || undefined,
        note: v.note || undefined,
        items: productItems,
        labTests: labTests.length ? labTests : undefined,
      });
      toast.success('Proforma created');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create proforma'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New proforma</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerId">Customer</Label>
              <select id="customerId" className={selectCls} {...register('customerId')}>
                <option value="">—</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Products</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => items.append(EMPTY_ROW)}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
            {items.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2">
                <select className={selectCls} {...register(`items.${i}.productId`)}>
                  <option value="">Select product…</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Input placeholder="Qty" type="number" step="any" {...register(`items.${i}.quantity`)} />
                <Input placeholder="Price" type="number" step="any" {...register(`items.${i}.unitPrice`)} />
                <Input placeholder="Tax %" type="number" step="any" {...register(`items.${i}.taxRate`)} />
                <Input placeholder="Disc" type="number" step="any" {...register(`items.${i}.discount`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => items.remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Clinical lines — lab / radiology / blood (optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => labs.append({ name: '', price: '0', type: 'LAB_TEST' })}>
                <Plus className="h-4 w-4" /> Add clinical line
              </Button>
            </div>
            {labs.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[2fr_1.3fr_1fr_auto] gap-2">
                <Input placeholder="Name" {...register(`labTests.${i}.name`)} />
                <select className={selectCls} {...register(`labTests.${i}.type`)}>
                  <option value="LAB_TEST">Lab test</option>
                  <option value="RADIOLOGY">Radiology</option>
                  <option value="BLOOD_DONATION">Blood donation</option>
                  <option value="BLOOD_REQUEST">Blood request</option>
                </select>
                <Input placeholder="Price" type="number" step="any" {...register(`labTests.${i}.price`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => labs.remove(i)}>
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
