import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { useCreateDelivery } from '@/features/returns/api';
import { useSale } from './api';

interface Props {
  saleId: string;
  saleReference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Add Delivery (EZHT `sales/add_delivery`): creates a delivery order for the sale
 * with the same fields as the legacy modal — Date, Delivery Order Reference, Sale
 * Reference (read-only), Customer, Address, Note. Prefills Customer + Address from
 * the sale. Saves via `POST /sale-deliveries`, so the row also appears on the
 * Deliveries page.
 */
export function AddDeliveryModal({
  saleId,
  saleReference,
  open,
  onOpenChange,
}: Props) {
  const { data: sale } = useSale(open ? saleId : null);
  const create = useCreateDelivery();

  const [form, setForm] = useState({
    date: '',
    reference: '',
    customer: '',
    address: '',
    note: '',
  });

  // Prefill Customer + Address from the sale once it loads (only while untouched).
  // Address mirrors EZHT: street + contact lines from the customer record.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (open && sale && !prefilled) {
      const c = sale.customer;
      const contact = [
        c?.phone ? `Tel: ${c.phone}` : '',
        c?.email ? `Email: ${c.email}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      const address = [c?.address ?? '', contact].filter(Boolean).join('\n');
      setForm((f) => ({
        ...f,
        customer: c?.name ?? '',
        address,
      }));
      setPrefilled(true);
    }
    if (!open) setPrefilled(false);
  }, [open, sale, prefilled]);

  const submit = async () => {
    try {
      await create.mutateAsync({
        saleId,
        reference: form.reference || undefined,
        saleReferenceNo: saleReference || undefined,
        customer: form.customer || undefined,
        address: form.address || undefined,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        note: form.note || undefined,
      });
      toast.success('Delivery added');
      onOpenChange(false);
      setForm({ date: '', reference: '', customer: '', address: '', note: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add delivery'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Delivery — {saleReference}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Order Reference No</Label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
                placeholder="Auto-generated if blank"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Sale Reference No</Label>
            <Input value={saleReference} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Input
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
