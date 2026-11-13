import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
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
  useProductDrugs,
  useAddProductDrug,
  useDeleteProductDrug,
} from './api';

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

/** EZHT "Drugs" modal — manage a product's drug composition rows. */
export function ProductDrugsDialog({
  productId,
  productName,
  open,
  onClose,
}: Props) {
  const { data: drugs, isLoading } = useProductDrugs(open ? productId : null);
  const add = useAddProductDrug(productId);
  const remove = useDeleteProductDrug(productId);

  const [name, setName] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const [unit, setUnit] = useState('');

  const onAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Enter a drug name.');
      return;
    }
    try {
      await add.mutateAsync({
        name: trimmed,
        unitValue: unitValue.trim() || undefined,
        unit: unit.trim() || undefined,
      });
      toast.success('Drug added');
      setName('');
      setUnitValue('');
      setUnit('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add drug'));
    }
  };

  const onDelete = async (drugId: string) => {
    try {
      await remove.mutateAsync(drugId);
      toast.success('Drug removed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not remove drug'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Drugs — {productName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-3 rounded-lg border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="drug-name">Drug</Label>
            <Input
              id="drug-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paracetamol"
            />
          </div>
          <div className="w-24 space-y-1.5">
            <Label htmlFor="drug-unit-value">Unit value</Label>
            <Input
              id="drug-unit-value"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              placeholder="500"
            />
          </div>
          <div className="w-24 space-y-1.5">
            <Label htmlFor="drug-unit">Unit</Label>
            <Input
              id="drug-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="mg"
            />
          </div>
          <Button onClick={onAdd} disabled={add.isPending}>
            {add.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-16 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (drugs?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No drugs added yet.
                  </TableCell>
                </TableRow>
              ) : (
                drugs!.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>
                      {[d.unitValue, d.unit].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(d.id)}
                        disabled={remove.isPending}
                        aria-label={`Remove ${d.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
