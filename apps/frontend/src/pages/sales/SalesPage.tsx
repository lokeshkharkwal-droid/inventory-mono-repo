import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Upload, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { exportCsv } from '@/lib/csv';
import {
  useInfiniteSales,
  useDeleteSale,
  type SaleListRow,
} from '@/features/sales/api';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';

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
      discount: r.discount || undefined,
    });
  }
  return [...groups.values()];
}

interface Props {
  /** POS Sales view: only sales rung through a POS register. */
  posOnly?: boolean;
}

/** Sales list (also reused for the POS Sales view). */
export function SalesPage({ posOnly }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const del = useDeleteSale();

  const extra = useMemo(
    () => ({
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      pos: posOnly ? 'true' : undefined,
    }),
    [status, paymentStatus, startDate, endDate, posOnly],
  );
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteSales({ search, extra });

  const totals = useMemo(
    () => ({
      grand: rows.reduce((s, r) => s + r.grandTotal, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
    }),
    [rows],
  );

  const remove = (id: string) => {
    if (!confirm('Delete this sale?')) return;
    del.mutate(id, {
      onSuccess: () => toast.success('Sale deleted'),
      onError: () => toast.error('Could not delete sale'),
    });
  };

  const columns: Column<SaleListRow>[] = [
    { key: 'reference', header: 'Reference' },
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleDateString(),
    },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name ?? '—' },
    { key: 'status', header: 'Status' },
    {
      key: 'grandTotal',
      header: 'Grand total',
      render: (r) => r.grandTotal.toFixed(2),
    },
    { key: 'paid', header: 'Paid', render: (r) => r.paid.toFixed(2) },
    {
      key: 'balance',
      header: 'Balance',
      render: (r) => (r.grandTotal - r.paid).toFixed(2),
    },
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
            onClick={() => navigate(`/sales/edit/${r.id}`)}
          >
            Edit
          </Button>
          <PrintButton path={`/print/sale/${r.id}`} title="Print invoice" />
          <PrintButton
            path={`/print/sale/${r.id}/receipt`}
            title="Print receipt"
            variant="outline"
          />
          <EmailDocumentButton type="sale" id={r.id} title="Email invoice" />
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => remove(r.id)}
          >
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
          <h1 className="text-xl font-semibold">
            {posOnly ? 'POS Sales' : 'Sales'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {posOnly
              ? 'Sales rung through a POS register.'
              : 'Invoices to customers (removes stock).'}
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
          {!posOnly && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Import
              </Button>
              <Button onClick={() => navigate('/sales/add')}>
                <Plus className="h-4 w-4" /> New sale
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className={selectCls}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
        </select>
        <select
          className={selectCls}
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
        >
          <option value="">All payments</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
        </select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-auto"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No sales yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <div className="flex justify-end gap-6 px-1 text-sm text-muted-foreground">
        <span>
          Grand total (loaded):{' '}
          <strong className="tabular-nums text-foreground">
            {totals.grand.toFixed(2)}
          </strong>
        </span>
        <span>
          Paid (loaded):{' '}
          <strong className="tabular-nums text-foreground">
            {totals.paid.toFixed(2)}
          </strong>
        </span>
      </div>

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
