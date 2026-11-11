import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { exportCsv } from '@/lib/csv';
import { useInfiniteSales, type SaleListRow } from '@/features/sales/api';
import { SaleFormDialog } from '@/features/sales/SaleFormDialog';

/** Group flat CSV line rows into sale documents keyed by reference/customer. */
function groupSaleRows(records: Record<string, string>[]): unknown[] {
  const groups = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    const key = r.reference || `${r.customerId}|${r.date}`;
    let doc = groups.get(key);
    if (!doc) {
      doc = {
        customerId: r.customerId,
        reference: r.reference || undefined,
        date: r.date || undefined,
        status: r.status || undefined,
        items: [] as unknown[],
      };
      groups.set(key, doc);
    }
    (doc.items as unknown[]).push({
      productId: r.productId,
      quantity: Number(r.quantity),
      price: Number(r.price),
      taxRate: r.taxRate ? Number(r.taxRate) : undefined,
      discount: r.discount ? Number(r.discount) : undefined,
    });
  }
  return [...groups.values()];
}

/** Sales list + create. */
export function SalesPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteSales({ search });

  const columns: Column<SaleListRow>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name ?? '—' },
    { key: 'status', header: 'Status' },
    { key: 'grandTotal', header: 'Total', render: (r) => r.grandTotal.toFixed(2) },
    { key: 'paid', header: 'Paid', render: (r) => r.paid.toFixed(2) },
    { key: 'paymentStatus', header: 'Payment' },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-px whitespace-nowrap',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditId(r.id);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <PrintButton path={`/print/sale/${r.id}`} title="Print invoice" />
          <PrintButton
            path={`/print/sale/${r.id}?template=tax`}
            title="Print tax invoice"
            variant="outline"
          >
            Tax
          </PrintButton>
          <PrintButton
            path={`/print/sale/${r.id}/receipt`}
            title="Print receipt"
            variant="outline"
          />
          <EmailDocumentButton type="sale" id={r.id} title="Email invoice" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales</h1>
          <p className="text-sm text-muted-foreground">
            Invoices to customers (removes stock).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (rows.length === 0) {
                toast.error('Nothing to export.');
                return;
              }
              exportCsv(
                'sales.csv',
                rows.map((r) => ({
                  reference: r.reference,
                  date: r.date,
                  customer: r.customer?.name ?? '',
                  status: r.status,
                  grandTotal: r.grandTotal,
                  paid: r.paid,
                  paymentStatus: r.paymentStatus,
                })),
              );
            }}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button
            onClick={() => {
              setEditId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New sale
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by reference…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No sales yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <SaleFormDialog
        open={formOpen}
        editId={editId}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditId(null);
        }}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Sales"
        endpoint="/sales/import"
        invalidateKey="sales"
        templateHeader="reference,customerId,date,status,productId,quantity,price,taxRate,discount"
        buildRows={groupSaleRows}
      />
    </div>
  );
}
