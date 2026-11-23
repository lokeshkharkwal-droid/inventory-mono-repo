import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { useBranchOptions } from '@/features/_shared/branches';
import { parseCsv, downloadFile } from '@/lib/csv';
import { getApiErrorMessage } from '@/lib/http';
import { useImportPurchaseDocument } from '@/features/purchases/api';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

const today = () => new Date().toISOString().slice(0, 10);

/** The EZHT `sample_purchase_import.csv` header + a dummy row (first 3 required). */
const SAMPLE_CSV =
  'code,name,expiry,serial,manufacturer,master_product_id,hsn_code,pack_quantity,free_pack_quantity,pack_size,pack_unit,pack_mrp,pack_cost,total,discount,taxable,cgst,sgst,supplier,supplier_id,invoice_number,invoice_date\n' +
  'PM001,Paracetamol 500mg,12-2026,LOT202406001,Pharma Inc,,30049099,100,10,10,Tablets,120,100,10000,0,,6,6,,,INV-001,2026-06-01\n';

/**
 * Pick one CSV field by any of the accepted (snake/camel) header names.
 */
function pick(r: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) if (r[k] != null && r[k] !== '') return r[k];
  return undefined;
}

/**
 * EZHT purchase import (`Purchases::purchase_import`): a header form + a CSV of
 * line items → one purchase. Missing products are created on the fly. The CSV is
 * parsed in the browser and sent as structured rows (matches `sample_purchase_import.csv`).
 */
export function PurchaseImportPage() {
  const navigate = useNavigate();
  const { data: branches } = useBranchOptions();
  const importMut = useImportPurchaseDocument();

  const [date, setDate] = useState(today());
  const [reference, setReference] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [taxMethod, setTaxMethod] = useState<'gst' | 'igst'>('gst');
  const [status, setStatus] = useState('RECEIVED');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [note, setNote] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [orderTax, setOrderTax] = useState('0');
  const [orderDiscount, setOrderDiscount] = useState('0');
  const [shipping, setShipping] = useState('0');

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      setRows(parseCsv(text));
    } catch {
      toast.error('Could not read the CSV file.');
      setRows([]);
    }
  };

  const buildBody = () => ({
    supplierId,
    warehouseId: warehouseId || undefined,
    reference: reference || undefined,
    date: date || undefined,
    status: status || undefined,
    interState: taxMethod === 'igst',
    orderTax: Number(orderTax || 0),
    orderDiscount: orderDiscount || undefined,
    shipping: Number(shipping || 0),
    note: note || undefined,
    attachmentUrl: attachmentUrl || undefined,
    rows: rows.map((r) => ({
      code: pick(r, 'code', 'product_code'),
      name: pick(r, 'name', 'product_name'),
      expiry: pick(r, 'expiry', 'expiry_date'),
      serial: pick(r, 'serial', 'batch', 'batch_no'),
      manufacturer: pick(r, 'manufacturer'),
      masterProductId: pick(r, 'master_product_id'),
      hsnCode: pick(r, 'hsn_code', 'hsn'),
      packQuantity: pick(r, 'pack_quantity'),
      freePackQuantity: pick(r, 'free_pack_quantity'),
      quantity: pick(r, 'quantity'),
      packSize: pick(r, 'pack_size'),
      packUnit: pick(r, 'pack_unit'),
      packMrp: pick(r, 'pack_mrp'),
      packCost: pick(r, 'pack_cost'),
      discount: pick(r, 'discount'),
      cgst: pick(r, 'cgst'),
      sgst: pick(r, 'sgst'),
    })),
  });

  const submit = async () => {
    if (!supplierId) return toast.error('Select a supplier.');
    if (rows.length === 0) return toast.error('Choose a CSV file with line items.');
    try {
      await importMut.mutateAsync(buildBody());
      toast.success('Purchase imported');
      navigate('/purchases');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not import the purchase'));
    }
  };

  return (
    <div className="max-w-4xl space-y-5 pb-16">
      <div>
        <h1 className="text-xl font-semibold">Import Purchase</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV of line items to create one purchase. Missing products are
          created automatically.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Reference Number</Label>
          <Input
            placeholder="Auto if blank"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
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
          <Label>Supplier</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <InfiniteSelect
                value={supplierId}
                onChange={setSupplierId}
                queryKey={['suppliers']}
                path="/suppliers"
                getOptionValue={(s) => s.id}
                getOptionLabel={(s) => s.name}
                placeholder="Select supplier…"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Add supplier"
              onClick={() => window.open('/inventory-app/suppliers/add', '_blank')}
            >
              +
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Tax Method</Label>
          <select
            className={selectCls}
            value={taxMethod}
            onChange={(e) => setTaxMethod(e.target.value as 'gst' | 'igst')}
          >
            <option value="gst">GST</option>
            <option value="igst">iGST</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            className={selectCls}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="RECEIVED">Received</option>
            <option value="PENDING">Pending</option>
            <option value="ORDERED">Ordered</option>
          </select>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">CSV file</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              downloadFile('sample_purchase_import.csv', SAMPLE_CSV)
            }
          >
            <Download className="h-4 w-4" /> Download Sample File
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Columns: code, name, expiry, serial, manufacturer, master_product_id,
          hsn_code, pack_quantity, free_pack_quantity, pack_size, pack_unit,
          pack_mrp, pack_cost, total, discount, taxable, cgst, sgst, supplier,
          supplier_id, invoice_number, invoice_date. First three are required.
        </p>
        <Input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {fileName && (
          <p className="text-sm text-muted-foreground">
            {fileName} — {rows.length} line{rows.length === 1 ? '' : 's'} parsed
          </p>
        )}
        <div className="space-y-1.5">
          <Label>Attach Document</Label>
          <AttachmentUpload value={attachmentUrl} onChange={setAttachmentUrl} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showMore}
            onChange={(e) => setShowMore(e.target.checked)}
          />
          More options
        </label>
        {showMore && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Order Tax %</Label>
              <Input
                type="number"
                step="any"
                value={orderTax}
                onChange={(e) => setOrderTax(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Order Discount</Label>
              <Input
                placeholder="0 or 5%"
                value={orderDiscount}
                onChange={(e) => setOrderDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping Charges</Label>
              <Input
                type="number"
                step="any"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={importMut.isPending}>
          <Upload className="h-4 w-4" />{' '}
          {importMut.isPending ? 'Importing…' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}
