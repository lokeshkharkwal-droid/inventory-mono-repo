import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
import { useSales } from '@/features/sales/api';
import {
  useDeliveries,
  useCreateDelivery,
  useDeliveryStatus,
  type DeliveryRow,
} from '@/features/returns/api';

const LIMIT = 20;
const STATUSES = ['PENDING', 'DISPATCHED', 'DELIVERED'];
const selectCls = 'flex h-9 rounded-md border border-input bg-background px-2 text-sm';

/** Sale deliveries: list + create + status updates. */
export function DeliveriesPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useDeliveries({ page, limit: LIMIT });
  const { data: sales } = useSales({ page: 1, limit: 100 });
  const create = useCreateDelivery();
  const status = useDeliveryStatus();

  const saleOptions = useMemo(() => sales?.data ?? [], [sales]);
  const [form, setForm] = useState({ saleId: '', trackingNo: '', deliveredTo: '', address: '' });

  const submit = async () => {
    if (!form.saleId) {
      toast.error('Select a sale.');
      return;
    }
    try {
      await create.mutateAsync({
        saleId: form.saleId,
        trackingNo: form.trackingNo || undefined,
        deliveredTo: form.deliveredTo || undefined,
        address: form.address || undefined,
      });
      toast.success('Delivery created');
      setOpen(false);
      setForm({ saleId: '', trackingNo: '', deliveredTo: '', address: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create delivery'));
    }
  };

  const onStatus = async (id: string, value: string) => {
    try {
      await status.mutateAsync({ id, status: value });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update status'));
    }
  };

  const columns: Column<DeliveryRow>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'trackingNo', header: 'Tracking', render: (r) => r.trackingNo ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <select className={selectCls} value={r.status} onChange={(e) => onStatus(r.id, e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Deliveries</h1>
          <p className="text-sm text-muted-foreground">Sale delivery tracking.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New delivery
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No deliveries yet."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Sale</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.saleId}
                onChange={(e) => setForm({ ...form, saleId: e.target.value })}
              >
                <option value="">—</option>
                {saleOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.reference}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tracking #</Label>
                <Input value={form.trackingNo} onChange={(e) => setForm({ ...form, trackingNo: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Delivered to</Label>
                <Input value={form.deliveredTo} onChange={(e) => setForm({ ...form, deliveredTo: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
