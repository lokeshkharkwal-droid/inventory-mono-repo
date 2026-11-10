import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import { useAddMaterialDamage, useAddMaterialRepair, type Material } from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
}

/** Record a damage or a repair against a material. */
export function MaterialActionsDialog({ open, onOpenChange, material }: Props) {
  const id = material?.id ?? '';
  const damage = useAddMaterialDamage(id);
  const repair = useAddMaterialRepair(id);
  const [dQty, setDQty] = useState('');
  const [dReason, setDReason] = useState('');
  const [rCost, setRCost] = useState('');
  const [rStatus, setRStatus] = useState('PENDING');

  const submitDamage = async () => {
    const qty = Number(dQty);
    if (!qty) {
      toast.error('Enter a damage quantity.');
      return;
    }
    try {
      await damage.mutateAsync({ quantity: qty, reason: dReason || undefined });
      toast.success('Damage recorded');
      setDQty('');
      setDReason('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record damage'));
    }
  };

  const submitRepair = async () => {
    try {
      await repair.mutateAsync({
        cost: rCost ? Number(rCost) : 0,
        status: rStatus,
      });
      toast.success('Repair recorded');
      setRCost('');
      setRStatus('PENDING');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record repair'));
    }
  };

  const selectCls =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Material — {material?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Record damage (reduces quantity)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dQty">Quantity</Label>
              <Input id="dQty" type="number" step="any" value={dQty} onChange={(e) => setDQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dReason">Reason</Label>
              <Input id="dReason" value={dReason} onChange={(e) => setDReason(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={submitDamage} disabled={damage.isPending}>
              {damage.isPending ? 'Saving…' : 'Record damage'}
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Record repair</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rCost">Cost</Label>
              <Input id="rCost" type="number" step="any" value={rCost} onChange={(e) => setRCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rStatus">Status</Label>
              <select id="rStatus" className={selectCls} value={rStatus} onChange={(e) => setRStatus(e.target.value)}>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={submitRepair} disabled={repair.isPending}>
              {repair.isPending ? 'Saving…' : 'Record repair'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
