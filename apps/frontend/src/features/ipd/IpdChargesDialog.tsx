import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import { useAdmissionCharges, useAddCharge, type Admission } from './api';

interface IpdChargesDialogProps {
  admission: Admission | null;
  onOpenChange: (open: boolean) => void;
}

/** Bedside billing: add and list the charges accrued against an IPD admission. */
export function IpdChargesDialog({
  admission,
  onOpenChange,
}: IpdChargesDialogProps) {
  const open = !!admission;
  const { data } = useAdmissionCharges(admission?.id ?? null);
  const add = useAddCharge();

  const [form, setForm] = useState({
    description: '',
    category: '',
    amount: '',
    date: '',
  });

  const submit = async () => {
    if (!admission) return;
    if (!form.description || !form.amount) {
      toast.error('Description and amount are required.');
      return;
    }
    try {
      await add.mutateAsync({
        admissionId: admission.id,
        description: form.description,
        category: form.category || undefined,
        amount: Number(form.amount),
        date: form.date || undefined,
      });
      toast.success('Charge added');
      setForm({ description: '', category: '', amount: '', date: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add charge'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Charges — {admission?.patientName} ({admission?.admissionNo})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-end gap-2">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="any"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <Button onClick={submit} disabled={add.isPending}>
              Add
            </Button>
          </div>

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.charges ?? []).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {new Date(c.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">{c.description}</td>
                    <td className="px-3 py-2">{c.category ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {Number(c.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(data?.charges ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No charges yet.
                    </td>
                  </tr>
                )}
              </tbody>
              {(data?.charges ?? []).length > 0 && (
                <tfoot>
                  <tr className="border-t font-medium">
                    <td className="px-3 py-2" colSpan={3}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(data?.total ?? 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
