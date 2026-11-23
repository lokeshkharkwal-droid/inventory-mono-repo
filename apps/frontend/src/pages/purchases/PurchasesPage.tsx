import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Upload, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { exportCsv } from '@/lib/csv';
import { openPrintDocumentPost } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfinitePurchases,
  type PurchaseListRow,
} from '@/features/purchases/api';
import { PurchaseActionsMenu } from '@/features/purchases/PurchaseActionsMenu';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';

/** Purchases list. */
export function PurchasesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const extra = useMemo(
    () => ({
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [status, paymentStatus, startDate, endDate],
  );
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfinitePurchases({ search, extra });

  const totals = useMemo(
    () => ({
      grand: rows.reduce((s, r) => s + r.grandTotal, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
    }),
    [rows],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onCombinePrint = async () => {
    if (selected.size === 0) {
      toast.error('Select purchases to combine.');
      return;
    }
    try {
      await openPrintDocumentPost('/print/combine', {
        type: 'purchase',
        ids: [...selected],
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not combine documents'));
    }
  };

  const columns: Column<PurchaseListRow>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-px',
      render: (r) => (
        <input
          type="checkbox"
          checked={selected.has(r.id)}
          onChange={() => toggle(r.id)}
          aria-label="Select purchase"
        />
      ),
    },
    { key: 'reference', header: 'Reference' },
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleDateString(),
    },
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name ?? '—' },
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
        <div className="flex justify-end">
          <PurchaseActionsMenu purchase={r} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Goods received from suppliers (adds stock).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCombinePrint}
            disabled={selected.size === 0}
            title="Combine selected into one printable file"
          >
            <Printer className="h-4 w-4" /> Combine print
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (rows.length === 0) {
                toast.error('Nothing to export.');
                return;
              }
              exportCsv(
                'purchases.csv',
                rows.map((r) => ({
                  reference: r.reference,
                  date: r.date,
                  supplier: r.supplier?.name ?? '',
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
          <Button
            variant="outline"
            onClick={() => navigate('/purchases/import')}
          >
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => navigate('/purchases/add')}>
            <Plus className="h-4 w-4" /> New purchase
          </Button>
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
          <option value="RECEIVED">Received</option>
          <option value="ORDERED">Ordered</option>
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
        emptyMessage="No purchases yet."
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
    </div>
  );
}
