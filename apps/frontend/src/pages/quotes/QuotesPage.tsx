import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, ArrowRightLeft, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfiniteQuotes,
  useConvertQuote,
  useDeleteQuote,
  useQuoteStatus,
  type QuoteListRow,
} from '@/features/quotes/api';
import { QuoteFormDialog } from '@/features/quotes/QuoteFormDialog';

/** Quotes list + create + approve/reject + convert-to-sale. */
export function QuotesPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteQuotes({ search });
  const convert = useConvertQuote();
  const del = useDeleteQuote();
  const status = useQuoteStatus();

  const setStatus = async (id: string, next: string) => {
    try {
      await status.mutateAsync({ id, status: next });
      toast.success(`Quote ${next.toLowerCase()}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update status'));
    }
  };

  const onConvert = async (r: QuoteListRow) => {
    const target = r.type === 'PURCHASE' ? 'purchase' : 'sale';
    if (!confirm(`Convert quote ${r.reference} to a ${target}?`)) return;
    try {
      await convert.mutateAsync(r.id);
      toast.success(`Quote converted to ${target}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not convert quote'));
    }
  };

  const onDelete = async (r: QuoteListRow) => {
    if (!confirm(`Delete quote ${r.reference}?`)) return;
    try {
      await del.mutateAsync(r.id);
      toast.success('Quote deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete quote'));
    }
  };

  const columns: Column<QuoteListRow>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status' },
    { key: 'grandTotal', header: 'Total', render: (r) => r.grandTotal.toFixed(2) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {(r.status === 'DRAFT' || r.status === 'SENT') && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatus(r.id, 'APPROVED')}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatus(r.id, 'REJECTED')}
              >
                <X className="h-4 w-4 text-destructive" /> Reject
              </Button>
            </>
          )}
          {r.status !== 'CONVERTED' && (
            <Button variant="ghost" size="sm" onClick={() => onConvert(r)}>
              <ArrowRightLeft className="h-4 w-4" />{' '}
              {r.type === 'PURCHASE' ? 'To purchase' : 'To sale'}
            </Button>
          )}
          <PrintButton path={`/print/quote/${r.id}`} title="Print quote" />
          <EmailDocumentButton type="quote" id={r.id} title="Email quote" />
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
          <h1 className="text-xl font-semibold">Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Sales & purchase quotations.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New quote
        </Button>
      </div>

      <Input
        placeholder="Search by reference…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No quotes yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <QuoteFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
