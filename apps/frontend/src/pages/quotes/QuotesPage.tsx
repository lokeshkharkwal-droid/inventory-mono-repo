import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { openPrintDocumentPost } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import {
  useInfiniteQuotes,
  useBulkDeleteQuotes,
  type QuoteListRow,
} from '@/features/quotes/api';
import { QuoteActionsMenu } from '@/features/quotes/QuoteActionsMenu';

/** Colour a quote status pill (EZHT `row_status` badges). */
function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'APPROVED' || status === 'COMPLETED'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'REJECTED'
        ? 'bg-rose-100 text-rose-800'
        : status === 'CONVERTED'
          ? 'bg-violet-100 text-violet-800'
          : status === 'SENT'
            ? 'bg-sky-100 text-sky-800'
            : 'bg-amber-100 text-amber-800'; // DRAFT = Pending
  const label = status === 'DRAFT' ? 'Pending' : status[0] + status.slice(1).toLowerCase();
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tone)}>
      {label}
    </span>
  );
}

/**
 * Quotes list (sales or purchase subset) — EZ Health Track `quotes/sales` and
 * `quotes/purchases` parity: date-range + reference search, party + source-branch
 * columns, status badges, row checkboxes with bulk Delete / Combine-PDF, and a
 * per-row Actions menu (details, edit, approve/reject, convert, print, email,
 * delete).
 */
export function QuotesPage({ type }: { type?: 'SALE' | 'PURCHASE' } = {}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const extra = useMemo(
    () => ({
      type,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [type, startDate, endDate],
  );
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteQuotes({ search, extra });
  const bulkDelete = useBulkDeleteQuotes();

  const partyHeader = type === 'PURCHASE' ? 'Supplier' : 'Customer';
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );

  const onBulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected quote(s)?`)) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(`${ids.length} quote(s) deleted`);
      setSelected(new Set());
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete quotes'));
    }
  };

  const onCombinePdf = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await openPrintDocumentPost('/print/combine', {
      type: 'quote',
      ids,
    });
    if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
  };

  const columns: Column<QuoteListRow>[] = [
    {
      key: 'select',
      header: '',
      render: (r) => (
        <input
          type="checkbox"
          checked={selected.has(r.id)}
          onChange={() => toggle(r.id)}
          aria-label={`Select ${r.reference}`}
        />
      ),
    },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'reference', header: 'Reference' },
    { key: 'party', header: partyHeader, render: (r) => r.partyName ?? '—' },
    { key: 'sourceBranch', header: 'Source Branch', render: (r) => r.sourceBranch ?? '—' },
    {
      key: 'grandTotal',
      header: 'Total',
      className: 'text-right',
      render: (r) => r.grandTotal.toFixed(2),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end">
          <QuoteActionsMenu quote={r} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {type === 'PURCHASE'
              ? 'Purchase Quotes'
              : type === 'SALE'
                ? 'Sales Quotes'
                : 'Quotes'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {type === 'PURCHASE'
              ? 'Quotations requested from suppliers.'
              : type === 'SALE'
                ? 'Quotations issued to customers.'
                : 'Sales & purchase quotations.'}
          </p>
        </div>
        <Button
          onClick={() =>
            navigate(
              type === 'PURCHASE' ? '/quotes/purchases/add' : '/quotes/sales/add',
            )
          }
        >
          <Plus className="h-4 w-4" />{' '}
          {type === 'PURCHASE' ? 'New purchase quote' : 'New sales quote'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="q-search" className="text-xs">
            Reference
          </Label>
          <Input
            id="q-search"
            placeholder="Search by reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-start" className="text-xs">
            From
          </Label>
          <Input
            id="q-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-end" className="text-xs">
            To
          </Label>
          <Input
            id="q-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        {(search || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            {selected.size} selected
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={onCombinePdf}
          >
            Combine PDF
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={bulkDelete.isPending}
          >
            Delete selected
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No quotes yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />
    </div>
  );
}
