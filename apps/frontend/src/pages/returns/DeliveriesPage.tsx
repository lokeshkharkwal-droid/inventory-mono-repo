import { DataTable, type Column } from '@/components/shared/DataTable';
import { useInfiniteDeliveries, type DeliveryRow } from '@/features/returns/api';
import { DeliveryActionsMenu } from '@/features/sales/DeliveryActionsMenu';

/**
 * Deliveries list — EZ Health Track parity (controller `Sales` `getDeliveries`).
 * Columns: Date (with time) / DO Reference No / Sale Reference No / Customer /
 * Address / Actions. Deliveries are created from a sale (Sales → Actions → Add
 * Delivery), so there is no standalone "New delivery" button here. Per-row
 * actions (Details / Edit / Download PDF / Delete) live in the Actions menu.
 */
export function DeliveriesPage() {
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteDeliveries();

  const columns: Column<DeliveryRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleString(),
    },
    { key: 'reference', header: 'DO Reference No' },
    {
      key: 'saleReferenceNo',
      header: 'Sale Reference No',
      render: (r) => r.saleReferenceNo ?? '—',
    },
    { key: 'customer', header: 'Customer', render: (r) => r.customer ?? '—' },
    { key: 'address', header: 'Address', render: (r) => r.address ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => <DeliveryActionsMenu delivery={r} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Deliveries</h1>
        <p className="text-sm text-muted-foreground">
          Delivery orders raised from sales.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No deliveries yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
