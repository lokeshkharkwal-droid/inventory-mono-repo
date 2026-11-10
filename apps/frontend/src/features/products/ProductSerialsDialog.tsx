import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import {
  useProductSerials,
  useAddProductSerials,
  type ProductListRow,
} from '@/features/products/api';

interface Props {
  product: ProductListRow | null;
  onOpenChange: (open: boolean) => void;
}

/** View + add serial/batch numbers for a serialized product (legacy serials). */
export function ProductSerialsDialog({ product, onOpenChange }: Props) {
  const open = !!product;
  const { data: serials } = useProductSerials(product?.id ?? null);
  const add = useAddProductSerials(product?.id ?? '');
  const [input, setInput] = useState('');

  const submit = async () => {
    const list = input
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error('Enter at least one serial number.');
      return;
    }
    try {
      await add.mutateAsync(list);
      toast.success(`Added ${list.length} serial(s).`);
      setInput('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add serials'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Serials — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="serials">Add serials (comma- or line-separated)</Label>
            <textarea
              id="serials"
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="SN-0001, SN-0002…"
            />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={add.isPending}>
                Add serials
              </Button>
            </div>
          </div>

          <div className="max-h-[40vh] space-y-1 overflow-auto rounded-md border p-2">
            {(serials ?? []).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono">{s.serialNo}</span>
                <span className="text-muted-foreground">{s.status}</span>
              </div>
            ))}
            {(serials ?? []).length === 0 && (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No serials recorded.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
