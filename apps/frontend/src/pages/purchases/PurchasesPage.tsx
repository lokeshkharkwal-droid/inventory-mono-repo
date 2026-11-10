import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Upload, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { exportCsv } from '@/lib/csv';
import { openPrintDocumentPost } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/http';
import { usePurchases, type PurchaseListRow } from '@/features/purchases/api';
import { PurchaseFormDialog } from '@/features/purchases/PurchaseFormDialog';
import { PurchaseManageDialog } from '@/features/purchases/PurchaseManageDialog';

const LIMIT = 20;

/** Group flat CSV line rows into purchase documents keyed by reference/supplier. */
function groupPurchaseRows(records: Record<string, string>[]): unknown[] {
  const groups = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    const key = r.reference || `${r.supplierId}|${r.date}`;
    let doc = groups.get(key);
    if (!doc) {
      doc = {
        supplierId: r.supplierId,
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
      cost: Number(r.cost),
      taxRate: r.taxRate ? Number(r.taxRate) : undefined,
      discount: r.discount ? Number(r.discount) : undefined,
      batchNo: r.batchNo || undefined,
      expiryDate: r.expiryDate || undefined,
    });
  }
  return [...groups.values()];
}

/** Purchases list + create. */
export function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manageRow, setManageRow] = useState<PurchaseListRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading } = usePurchases({ page, limit: LIMIT, search });

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
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name ?? '—' },
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
            onClick={() => setManageRow(r)}
            title="Payments & expenses"
          >
            Manage
          </Button>
          <PrintButton
            path={`/print/purchase/${r.id}`}
            title="Print purchase order"
          />
          <EmailDocumentButton
            type="purchase"
            id={r.id}
            title="Email purchase order"
          />
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
              const rows = data?.data ?? [];
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
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> New purchase
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by reference…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No purchases yet."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <PurchaseFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <PurchaseManageDialog
        purchase={manageRow}
        onOpenChange={(o) => !o && setManageRow(null)}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Purchases"
        endpoint="/purchases/import"
        invalidateKey="purchases"
        templateHeader="reference,supplierId,date,status,productId,quantity,cost,taxRate,discount,batchNo,expiryDate"
        buildRows={groupPurchaseRows}
      />
    </div>
  );
}
