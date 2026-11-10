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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/http';
import {
  useProductStock,
  useRecordAdjustment,
  useSetRack,
  type ProductListRow,
} from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductListRow | null;
}

/** Shows per-branch stock and lets the user record an adjustment at their branch. */
export function ProductStockDialog({ open, onOpenChange, product }: Props) {
  const { data: stock, isLoading } = useProductStock(open ? product?.id ?? null : null);
  const adjust = useRecordAdjustment(product?.id ?? '');
  const setRackMut = useSetRack(product?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [reason, setReason] = useState('');
  const [rack, setRack] = useState('');

  const onSetRack = async () => {
    try {
      await setRackMut.mutateAsync(rack);
      toast.success('Rack updated');
      setRack('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update rack'));
    }
  };

  const onAdjust = async () => {
    const qty = Number(quantity);
    if (!qty) {
      toast.error('Enter a non-zero quantity (negative to subtract).');
      return;
    }
    try {
      await adjust.mutateAsync({
        quantity: qty,
        cost: cost ? Number(cost) : undefined,
        reason: reason || undefined,
      });
      toast.success('Stock adjusted');
      setQuantity('');
      setCost('');
      setReason('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not adjust stock'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Stock — {product?.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Avg cost</TableHead>
                <TableHead>Rack</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (stock?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No stock recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                stock!.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.branchId}</TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell>{s.avgCost}</TableCell>
                    <TableCell>{s.rack ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Record adjustment (at your active branch)</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity (± )</Label>
              <Input
                id="qty"
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Unit cost (add)</Label>
              <Input
                id="cost"
                type="number"
                step="any"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onAdjust} disabled={adjust.isPending}>
              {adjust.isPending ? 'Saving…' : 'Apply adjustment'}
            </Button>
          </div>
        </div>

        <div className="flex items-end gap-3 rounded-lg border p-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="rack">Rack / bin (active branch)</Label>
            <Input
              id="rack"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              placeholder="e.g. A-12"
            />
          </div>
          <Button
            variant="outline"
            onClick={onSetRack}
            disabled={setRackMut.isPending}
          >
            {setRackMut.isPending ? 'Saving…' : 'Set rack'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
