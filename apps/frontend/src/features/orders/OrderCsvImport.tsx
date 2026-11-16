import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { request, getApiErrorMessage } from '@/lib/http';
import { parseCsv, downloadFile } from '@/lib/csv';
import { useBranchOptions } from '@/features/_shared/branches';
import type { ImportSummary } from '@/components/shared/ImportDialog';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

const SALE_HEADER =
  'productId,quantity,price,discount,taxRate,serial,expiry';
const PURCHASE_HEADER =
  'productId,quantity,cost,mrp,discount,taxRate,batchNo,expiry';

interface Props {
  mode: 'sale' | 'purchase';
}

/**
 * EZHT "Generate order by CSV" / "Purchase import": pick a warehouse + party,
 * upload a CSV of line items, and create ONE document from those lines. Preview
 * (dry-run) validates every row before committing.
 */
export function OrderCsvImport({ mode }: Props) {
  const isSale = mode === 'sale';
  const qc = useQueryClient();
  const { data: branches } = useBranchOptions();
  const [partyId, setPartyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState(isSale ? 'COMPLETED' : 'RECEIVED');
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const header = isSale ? SALE_HEADER : PURCHASE_HEADER;
  const endpoint = isSale ? '/sales/import' : '/purchases/import';

  const onFile = async (file: File) => {
    try {
      const records = parseCsv(await file.text());
      const built = records.map((r) => ({
        productId: r.productId,
        quantity: Number(r.quantity),
        [isSale ? 'price' : 'cost']: Number(r.price ?? r.cost ?? 0),
        ...(isSale ? {} : { mrp: r.mrp ? Number(r.mrp) : undefined }),
        discount: r.discount || undefined,
        taxRate: r.taxRate ? Number(r.taxRate) : undefined,
        ...(isSale
          ? { serialNo: r.serial || undefined }
          : { batchNo: r.batchNo || undefined }),
        expiryDate: r.expiry || undefined,
      }));
      setItems(built);
      setFileName(file.name);
      setSummary(null);
      if (built.length === 0) toast.error('No data rows found in the file.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not read the file'));
    }
  };

  const run = async (dryRun: boolean) => {
    if (!partyId) {
      toast.error(`Select a ${isSale ? 'customer' : 'supplier'} first.`);
      return;
    }
    if (items.length === 0) {
      toast.error('Choose a CSV file first.');
      return;
    }
    const row = {
      [isSale ? 'customerId' : 'supplierId']: partyId,
      warehouseId: warehouseId || undefined,
      reference: reference || undefined,
      status,
      items,
    };
    setBusy(true);
    try {
      const res = await request<ImportSummary>('POST', endpoint, {
        body: { dryRun, rows: [row] },
      });
      setSummary(res);
      if (!dryRun && res.created > 0) {
        toast.success('Order created from CSV');
        qc.invalidateQueries({ queryKey: [isSale ? 'sales' : 'purchases'] });
        setItems([]);
        setFileName('');
      } else if (!dryRun) {
        toast.error('No order created — check row errors.');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Import failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">
          {isSale ? 'Generate order by CSV' : 'Purchase import'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV of line items to create one{' '}
          {isSale ? 'sale' : 'purchase'}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <div className="space-y-1.5">
          <Label>{isSale ? 'Customer' : 'Supplier'}</Label>
          <InfiniteSelect
            value={partyId}
            onChange={setPartyId}
            queryKey={[isSale ? 'customers' : 'suppliers']}
            path={isSale ? '/customers' : '/suppliers'}
            getOptionValue={(c) => c.id}
            getOptionLabel={(c) => c.name}
            placeholder={`Select ${isSale ? 'customer' : 'supplier'}…`}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Warehouse</Label>
          <select
            className={selectCls}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Active branch</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Reference</Label>
          <Input
            placeholder="Auto if blank"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            className={selectCls}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {(isSale
              ? ['COMPLETED', 'PENDING']
              : ['RECEIVED', 'ORDERED', 'PENDING']
            ).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Columns: <code className="text-xs">{header}</code>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile('import-template.csv', `${header}\n`)}
          >
            <Download className="h-4 w-4" /> Template
          </Button>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
        {fileName && (
          <p className="text-sm">
            {fileName} — <strong>{items.length}</strong> line(s) parsed
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => run(true)}
            disabled={busy || items.length === 0}
          >
            Preview
          </Button>
          <Button onClick={() => run(false)} disabled={busy || items.length === 0}>
            <Upload className="h-4 w-4" /> Create order
          </Button>
        </div>
        {summary && (
          <div className="text-sm">
            <span className="text-green-600">
              {summary.dryRun
                ? `Valid: ${summary.validated}`
                : `Created: ${summary.created}`}
            </span>
            {summary.errors > 0 && (
              <span className="ml-3 text-destructive">
                Errors: {summary.errors}
                {summary.results.find((r) => r.status === 'error')?.error
                  ? ` — ${summary.results.find((r) => r.status === 'error')?.error}`
                  : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
