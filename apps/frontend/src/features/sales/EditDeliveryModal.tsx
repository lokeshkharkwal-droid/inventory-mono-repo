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
import { useDeliveryDetail, useUpdateDelivery } from '@/features/returns/api';

interface Props {
  deliveryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Edit a delivery's details (EZHT `sales/edit_delivery`). */
export function EditDeliveryModal({ deliveryId, open, onOpenChange }: Props) {
  const { data } = useDeliveryDetail(open ? deliveryId : null);
  const update = useUpdateDelivery();

  const [form, setForm] = useState({
    date: '',
    reference: '',
    saleReferenceNo: '',
    customer: '',
    address: '',
    note: '',
  });

  // Hydrate the form once the delivery loads.
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  useEffect(() => {
    if (open && data && hydratedId !== data.id) {
      setForm({
        // datetime-local wants `yyyy-MM-ddTHH:mm` in local time.
        date: toLocalInput(data.date),
        reference: data.reference ?? '',
        saleReferenceNo: data.saleReferenceNo ?? '',
        customer: data.customer ?? '',
        address: data.address ?? '',
        note: data.note ?? '',
      });
      setHydratedId(data.id);
    }
    if (!open) setHydratedId(null);
  }, [open, data, hydratedId]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!deliveryId) return;
    try {
      await update.mutateAsync({
        id: deliveryId,
        input: {
          reference: form.reference || undefined,
          saleReferenceNo: form.saleReferenceNo || undefined,
          customer: form.customer || undefined,
          address: form.address || undefined,
          date: form.date ? new Date(form.date).toISOString() : undefined,
          note: form.note || undefined,
        },
      });
      toast.success('Delivery updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update delivery'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Delivery</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="datetime-local"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery Order Reference No</Label>
            <Input
              value={form.reference}
              onChange={(e) => set('reference', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sale Reference No</Label>
            <Input
              value={form.saleReferenceNo}
              onChange={(e) => set('saleReferenceNo', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Input
              value={form.customer}
              onChange={(e) => set('customer', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ISO instant → `yyyy-MM-ddTHH:mm` in the browser's local time for datetime-local. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
