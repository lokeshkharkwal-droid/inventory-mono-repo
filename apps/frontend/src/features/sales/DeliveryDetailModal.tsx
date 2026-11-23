import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeliveryDetail } from '@/features/returns/api';

interface Props {
  deliveryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Delivery details (EZHT `sales/view_delivery`): the delivery header fields, the
 * originating sale's line items, and Prepared/Delivered/Received-by signature
 * blocks.
 */
export function DeliveryDetailModal({ deliveryId, open, onOpenChange }: Props) {
  const { data, isLoading } = useDeliveryDetail(open ? deliveryId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delivery Order</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : (
          <div className="space-y-4">
            <table className="w-full border-collapse text-sm">
              <tbody>
                <Row label="Date" value={new Date(data.date).toLocaleString()} />
                <Row label="DO Reference No" value={data.reference} />
                <Row label="Sale Reference No" value={data.saleReferenceNo ?? '—'} />
                <Row label="Customer" value={data.customer ?? '—'} />
                <Row label="Address" value={data.address ?? '—'} />
                {data.note ? <Row label="Note" value={data.note} /> : null}
              </tbody>
            </table>

            <div>
              <h3 className="mb-1 text-sm font-semibold">Items</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-10 border px-2 py-1 text-center">#</th>
                    <th className="border px-2 py-1 text-left">Description</th>
                    <th className="w-20 border px-2 py-1 text-center">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="border px-2 py-3 text-center text-muted-foreground"
                      >
                        No items.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="border px-2 py-1 text-center">{idx + 1}</td>
                        <td className="border px-2 py-1">
                          {it.productName}
                          {it.productCode ? ` (${it.productCode})` : ''}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {it.quantity}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 text-sm">
              <Sign label="Prepared by" name={data.createdByName ?? ''} />
              <Sign label="Delivered by" name="" />
              <Sign label="Received by" name="" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b">
      <td className="w-1/3 border px-2 py-1 font-medium">{label}</td>
      <td className="border px-2 py-1">{value}</td>
    </tr>
  );
}

function Sign({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <p className="h-16">
        {label}
        {name ? `: ${name}` : ':'}
      </p>
      <hr />
      <p className="text-muted-foreground">Stamp &amp; Sign</p>
    </div>
  );
}
