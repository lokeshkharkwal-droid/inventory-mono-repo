import { useState } from 'react';
import { toast } from 'sonner';
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
import { request, getApiErrorMessage } from '@/lib/http';

/**
 * Inline "Add Referral" from the Add-Sale page (EZHT inline ReferralForm). Creates
 * an External Referral in the caller's tenant via `POST /integration/referrals`
 * (proxied to kalnostics) and reports the new `{ id, name }` up so the sale's
 * Referral field can select it without leaving the page.
 */
export function AddReferralDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (referral: { id: string; name: string }) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    organisationName: '',
    mobileNumber: '',
    email: '',
    address: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Referral name is required.');
      return;
    }
    setBusy(true);
    try {
      const created = (await request('POST', '/integration/referrals', {
        body: {
          name: form.name.trim(),
          organisationName: form.organisationName || undefined,
          mobileNumber: form.mobileNumber || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
        },
      })) as { id: string; name?: string };
      toast.success('Referral added');
      onCreated({ id: created.id, name: created.name ?? form.name.trim() });
      onOpenChange(false);
      setForm({
        name: '',
        organisationName: '',
        mobileNumber: '',
        email: '',
        address: '',
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add referral'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add referral</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Referral name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Organisation / Business name</Label>
            <Input
              value={form.organisationName}
              onChange={(e) =>
                setForm({ ...form, organisationName: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile</Label>
            <Input
              value={form.mobileNumber}
              onChange={(e) =>
                setForm({ ...form, mobileNumber: e.target.value })
              }
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
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
