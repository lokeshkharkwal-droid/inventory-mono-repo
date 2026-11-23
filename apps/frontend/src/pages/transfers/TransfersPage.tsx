import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Send, Download, Upload, FileDown, Pencil, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { useRowSelection, BulkPdfBar } from '@/components/shared/bulk-pdf';
import { getApiErrorMessage } from '@/lib/http';
import { exportCsv } from '@/lib/csv';
import { openCombinedPdf, printRowsAsPdf } from '@/lib/print';
import { useBranchOptions } from '@/features/_shared/branches';
import {
  useInfiniteTransfers,
  useTransferAction,
  openTransferPdf,
  type TransferListRow,
} from '@/features/transfers/api';

const money = (v: string | number | null) =>
  v == null ? '—' : Number(v).toFixed(2);

/** Group flat CSV line rows into transfer documents keyed by reference. */
function groupTransferRows(records: Record<string, string>[]): unknown[] {
  const groups = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    const key = r.reference || `${r.fromBranchId}|${r.toBranchId}|${r.date}`;
    let doc = groups.get(key);
    if (!doc) {
      doc = {
        fromBranchId: r.fromBranchId,
        toBranchId: r.toBranchId,
        reference: r.reference || undefined,
        date: r.date || undefined,
        items: [] as unknown[],
      };
      groups.set(key, doc);
    }
    (doc.items as unknown[]).push({
      productId: r.productId,
      quantity: Number(r.quantity),
    });
  }
  return [...groups.values()];
}

/** Transfers list + create + two-stage send/receive. */
export function TransfersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const sel = useRowSelection();
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteTransfers({ search });
  const action = useTransferAction();
  const { data: branches } = useBranchOptions();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? (map.get(id) ?? id) : '—');
  }, [branches]);

  const run = async (id: string, act: 'send' | 'receive') => {
    try {
      await action.mutateAsync({ id, action: act });
      toast.success(act === 'send' ? 'Transfer sent' : 'Transfer received');
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Could not ${act} transfer`));
    }
  };

  const columns: Column<TransferListRow>[] = [
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleString() },
    { key: 'reference', header: 'Reference No' },
    {
      key: 'fromWarehouse',
      header: 'From Warehouse',
      render: (r) => branchName(r.fromBranchId),
    },
    {
      key: 'toWarehouse',
      header: 'To Warehouse',
      render: (r) => branchName(r.toBranchId),
    },
    { key: 'total', header: 'Total', render: (r) => money(r.total) },
    { key: 'totalTax', header: 'Product Tax', render: (r) => money(r.totalTax) },
    { key: 'grandTotal', header: 'Grand Total', render: (r) => money(r.grandTotal) },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Transfer details"
            onClick={() => navigate(`/transfers/view/${r.id}`)}
          >
            <FileText className="h-4 w-4" /> Details
          </Button>
          {r.status === 'PENDING' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => run(r.id, 'send')}>
                <Send className="h-4 w-4" /> Send
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/transfers/edit/${r.id}`)}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </>
          )}
          {r.status === 'IN_TRANSIT' && (
            <Button variant="ghost" size="sm" onClick={() => run(r.id, 'receive')}>
              <Download className="h-4 w-4" /> Receive
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Download PDF"
            onClick={() =>
              void openTransferPdf(r.id).catch((e) =>
                toast.error(
                  e instanceof Error ? e.message : 'Could not generate PDF',
                ),
              )
            }
          >
            <FileText className="h-4 w-4" />
          </Button>
          <EmailDocumentButton type="transfer" id={r.id} title="Email transfer" />
          <PrintButton path={`/print/transfer/${r.id}`} title="Print transfer" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Move stock between branches (send → receive).
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
                'transfers.csv',
                rows.map((r) => ({
                  date: r.date,
                  reference: r.reference,
                  fromWarehouse: branchName(r.fromBranchId),
                  toWarehouse: branchName(r.toBranchId),
                  total: money(r.total),
                  productTax: money(r.totalTax),
                  grandTotal: money(r.grandTotal),
                  status: r.status,
                })),
              );
            }}
          >
            <FileDown className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => navigate('/transfers/add')}>
            <Plus className="h-4 w-4" /> New transfer
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by reference…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <BulkPdfBar
        count={sel.selectedIds.size}
        onCombine={() => void openCombinedPdf('transfer', [...sel.selectedIds])}
        onExport={() =>
          printRowsAsPdf(
            'Transfers',
            ['Date', 'Reference No', 'From Warehouse', 'To Warehouse', 'Total', 'Product Tax', 'Grand Total', 'Status'],
            rows
              .filter((r) => sel.selectedIds.has(r.id))
              .map((r) => [
                new Date(r.date).toLocaleString(),
                r.reference,
                branchName(r.fromBranchId),
                branchName(r.toBranchId),
                money(r.total),
                money(r.totalTax),
                money(r.grandTotal),
                r.status,
              ]),
          )
        }
        onClear={sel.clear}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No transfers yet."
        selection={sel.selection}
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Transfers"
        endpoint="/transfers/import"
        invalidateKey="transfers"
        templateHeader="reference,fromBranchId,toBranchId,date,productId,quantity"
        buildRows={groupTransferRows}
      />
    </div>
  );
}
