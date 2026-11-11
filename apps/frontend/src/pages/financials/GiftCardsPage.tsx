import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Coins, Trash2 } from 'lucide-react';
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
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfiniteGiftCards,
  useCreateGiftCard,
  useRedeemGiftCard,
  useDeleteGiftCard,
  type GiftCard,
} from '@/features/gift-cards/api';

/** Gift cards: list, create, redeem balance. */
export function GiftCardsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteGiftCards({ search });
  const create = useCreateGiftCard();
  const redeem = useRedeemGiftCard();
  const del = useDeleteGiftCard();

  const [form, setForm] = useState({ code: '', value: '', expiryDate: '' });

  const submit = async () => {
    if (!form.code || !form.value) {
      toast.error('Code and value are required.');
      return;
    }
    try {
      await create.mutateAsync({
        code: form.code,
        value: Number(form.value),
        expiryDate: form.expiryDate || undefined,
      });
      toast.success('Gift card created');
      setOpen(false);
      setForm({ code: '', value: '', expiryDate: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create gift card'));
    }
  };

  const onRedeem = async (r: GiftCard) => {
    const amount = prompt(`Redeem amount (balance ${r.balance}):`);
    if (amount == null) return;
    try {
      await redeem.mutateAsync({ id: r.id, amount: Number(amount) });
      toast.success('Redeemed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not redeem'));
    }
  };

  const onDelete = async (r: GiftCard) => {
    if (!confirm(`Delete gift card ${r.code}?`)) return;
    try {
      await del.mutateAsync(r.id);
      toast.success('Gift card deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete'));
    }
  };

  const columns: Column<GiftCard>[] = [
    { key: 'code', header: 'Code' },
    { key: 'value', header: 'Value', render: (r) => r.value.toFixed(2) },
    { key: 'balance', header: 'Balance', render: (r) => r.balance.toFixed(2) },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.status === 'ACTIVE' && (
            <Button variant="ghost" size="sm" onClick={() => onRedeem(r)}>
              <Coins className="h-4 w-4" /> Redeem
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(r)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Gift cards</h1>
          <p className="text-sm text-muted-foreground">Prepaid cards with a redeemable balance.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New gift card
        </Button>
      </div>

      <Input
        placeholder="Search by code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No gift cards yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New gift card</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input type="number" step="any" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
