import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import {
  useSupplierPaymentsList,
  useAddSupplierPayment,
  type SupplierPaymentListRow,
} from '@/features/purchases/api';
import { PurchaseActionsMenu } from '@/features/purchases/PurchaseActionsMenu';

const selectCls =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm';

const PAY_METHODS: { code: string; label: string }[] = [
  { code: 'CASH', label: 'Cash' },
  { code: 'GIFT_CARD', label: 'Gift Card' },
  { code: 'CARD', label: 'Credit Card' },
  { code: 'CHEQUE', label: 'Check' },
  { code: 'OTHER', label: 'Other' },
];

/**
 * Supplier payments screen (EZHT `supplier_payments`): a filterable, paginated
 * list of purchases with grand total / paid / balance / status. Select a single
 * supplier's purchases and record one payment allocated across them.
 */
export function SupplierPaymentsPage() {
  // Applied filters (change on Submit, mirroring the legacy form).
  const [filters, setFilters] = useState({
    supplierId: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  // Draft filter inputs.
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);

  const { data, isLoading } = useSupplierPaymentsList({
    page,
    limit,
    supplierId: filters.supplierId,
    search: filters.search,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const applyFilters = () => {
    setFilters({ supplierId, search, startDate, endDate });
    setPage(1);
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const suppliersInSelection = new Set(
    selectedRows.map((r) => r.supplier?.id ?? ''),
  );

  const openPay = () => {
    if (selectedRows.length === 0) {
      toast.error('Select purchases to pay.');
      return;
    }
    if (suppliersInSelection.size > 1) {
      toast.error('Select purchases from a single supplier.');
      return;
    }
    setPayOpen(true);
  };

  const footer = useMemo(
    () => ({
      grand: rows.reduce((s, r) => s + r.grandTotal, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      balance: rows.reduce((s, r) => s + r.balance, 0),
    }),
    [rows],
  );

  const columns: Column<SupplierPaymentListRow>[] = [
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
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.date).toLocaleString(),
    },
    { key: 'reference', header: 'Reference' },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (r) => r.supplier?.name ?? '—',
    },
    { key: 'status', header: 'Purchase' },
    {
      key: 'grandTotal',
      header: 'Grand Total',
      className: 'text-right',
      render: (r) => r.grandTotal.toFixed(2),
    },
    {
      key: 'paid',
      header: 'Paid',
      className: 'text-right',
      render: (r) => r.paid.toFixed(2),
    },
    {
      key: 'balance',
      header: 'Balance',
      className: 'text-right',
      render: (r) => r.balance.toFixed(2),
    },
    { key: 'paymentStatus', header: 'Payment Status' },
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
          <h1 className="text-xl font-semibold">Supplier Payments</h1>
          <p className="text-sm text-muted-foreground">
            Pay across a supplier's outstanding purchases.
          </p>
        </div>
        <Button onClick={openPay} disabled={selected.size === 0}>
          Add Supplier Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Supplier</Label>
          <InfiniteSelect
            value={supplierId}
            onChange={setSupplierId}
            queryKey={['suppliers']}
            path="/suppliers"
            getOptionValue={(s) => s.id}
            getOptionLabel={(s) => s.name}
            placeholder="All suppliers"
            clearable
          />
        </div>
        <div className="space-y-1.5">
          <Label>Reference Number</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="sm:col-span-4">
          <Button onClick={applyFilters}>Submit</Button>
        </div>
      </div>

      {/* Show entries */}
      <div className="flex items-center gap-2 text-sm">
        <span>Show</span>
        <select
          className={selectCls}
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>entries</span>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No purchases found."
      />

      {/* Footer totals + pager */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-sm">
        <div className="flex gap-6 text-muted-foreground">
          <span>
            Grand total:{' '}
            <strong className="tabular-nums text-foreground">
              {footer.grand.toFixed(2)}
            </strong>
          </span>
          <span>
            Paid:{' '}
            <strong className="tabular-nums text-foreground">
              {footer.paid.toFixed(2)}
            </strong>
          </span>
          <span>
            Balance:{' '}
            <strong className="tabular-nums text-foreground">
              {footer.balance.toFixed(2)}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span>
            Page {page} of {pageCount} · {total} total
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <SupplierPaymentModal
        rows={selectedRows}
        open={payOpen}
        onOpenChange={setPayOpen}
        onDone={() => {
          setPayOpen(false);
          setSelected(new Set());
        }}
      />
    </div>
  );
}

/** Allocate one supplier payment across the selected purchases (same supplier). */
function SupplierPaymentModal({
  rows,
  open,
  onOpenChange,
  onDone,
}: {
  rows: SupplierPaymentListRow[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const addSupplierPayment = useAddSupplierPayment();
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [note, setNote] = useState('');
  const [alloc, setAlloc] = useState<Record<string, string>>({});

  const supplierId = rows[0]?.supplier?.id ?? '';
  const amountFor = (r: SupplierPaymentListRow) =>
    alloc[r.id] != null ? Number(alloc[r.id]) : r.balance;
  const totalPay = rows.reduce((s, r) => s + (amountFor(r) || 0), 0);

  const submit = async () => {
    if (!supplierId) return toast.error('No supplier selected.');
    const allocations = rows
      .map((r) => ({ purchaseId: r.id, amount: amountFor(r) }))
      .filter((a) => a.amount > 0);
    if (allocations.length === 0) return toast.error('Enter an amount.');
    try {
      await addSupplierPayment.mutateAsync({
        supplierId,
        amount: allocations.reduce((s, a) => s + a.amount, 0),
        method,
        reference: reference || undefined,
        chequeNo: method === 'CHEQUE' ? chequeNo || undefined : undefined,
        note: note || undefined,
        allocations,
      });
      toast.success('Supplier payment recorded');
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record payment'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Add Supplier Payment — {rows[0]?.supplier?.name ?? ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">Reference</th>
                  <th className="px-2 text-right">Balance</th>
                  <th className="px-2 text-right">Pay</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">{r.reference}</td>
                    <td className="px-2 text-right tabular-nums">
                      {r.balance.toFixed(2)}
                    </td>
                    <td className="px-2 text-right">
                      <Input
                        type="number"
                        step="any"
                        className="h-8 w-28 text-right"
                        value={alloc[r.id] ?? r.balance.toFixed(2)}
                        onChange={(e) =>
                          setAlloc((a) => ({ ...a, [r.id]: e.target.value }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Paying By</Label>
              <select
                className={`${selectCls} w-full`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAY_METHODS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {method === 'CHEQUE' && (
              <div className="space-y-1.5">
                <Label>Cheque No</Label>
                <Input
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div className="text-right text-sm">
            Total to pay:{' '}
            <strong className="tabular-nums">{totalPay.toFixed(2)}</strong>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={addSupplierPayment.isPending}>
            {addSupplierPayment.isPending ? 'Saving…' : 'Record payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
