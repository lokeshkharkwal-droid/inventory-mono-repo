import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { customerHooks, type Customer } from './api';

/**
 * Read-only customer (patient) detail — the Add-Sale "View Patient" action
 * (EZHT `customers/view_patient`). Fetches the selected customer and shows the
 * key identity + contact fields.
 */
export function ViewCustomerDialog({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: c, isLoading } = customerHooks.useOne(
    open && customerId ? customerId : undefined,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Patient details</DialogTitle>
        </DialogHeader>
        {isLoading || !c ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Name" value={c.name} />
            <Field label="Code" value={c.code ?? '—'} />
            <Field label="Phone" value={c.phone ?? '—'} />
            <Field label="Email" value={c.email ?? '—'} />
            <Field label="GST No." value={c.gstNo ?? '—'} />
            <Field label="Address" value={c.address ?? '—'} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

/**
 * Inline "Add Patient" from the Add-Sale page (EZHT `customers/add_patient`).
 * Minimal subset — name (required) + contact fields; on save reports the created
 * customer up so the sale's Customer field can select it without leaving the page.
 */
export function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: Customer) => void;
}) {
  const create = customerHooks.useCreate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstNo: '',
  });

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    try {
      const created = (await create.mutateAsync({
        name: form.name.trim(),
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        gstNo: form.gstNo || undefined,
      })) as Customer;
      toast.success('Patient added');
      onCreated(created);
      onOpenChange(false);
      setForm({ name: '', phone: '', email: '', address: '', gstNo: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add patient'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add patient</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>GST No.</Label>
            <Input
              value={form.gstNo}
              onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
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
