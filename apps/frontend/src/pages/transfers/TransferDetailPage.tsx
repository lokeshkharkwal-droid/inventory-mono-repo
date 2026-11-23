import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Printer,
  FileText,
  Barcode as BarcodeIcon,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EzhtSkin } from '@/components/shared/EzhtSkin';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { Barcode } from '@/components/shared/Barcode';
import { QrCode } from '@/components/shared/QrCode';
import { openPrintDocument, openPrintDocumentPost } from '@/lib/print';
import { useBranchOptions } from '@/features/_shared/branches';
import { openTransferPdf, useTransfer } from '@/features/transfers/api';

const money = (v: string | number | null | undefined) =>
  v == null ? '0.00' : Number(v).toFixed(2);

/**
 * Transfer detail / view page (EZ Health Track `transfers/view/:id`): a routable,
 * barcode/QR-bearing view with the from/to warehouse + department, line items
 * (batch / serial / expiry / qty / rate / MRP / HSN / tax / subtotal), totals and
 * the Email / Download PDF / Print / Print Barcodes / Edit actions.
 */
export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useTransfer(id);
  const { data: branches } = useBranchOptions();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (bid: string | null) => (bid ? (map.get(bid) ?? bid) : '—');
  }, [branches]);

  if (isLoading || !data) {
    return (
      <EzhtSkin title="Transfer Details">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </EzhtSkin>
    );
  }

  const t = data;

  const printBarcodes = () =>
    void openPrintDocumentPost('/print/barcodes', {
      items: t.items
        .filter((i) => i.productId)
        .map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
    });

  return (
    <EzhtSkin title={`Stock Transfer ${t.reference}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <EmailDocumentButton
              type="transfer"
              id={t.id}
              title="Email transfer"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void openTransferPdf(t.id).catch((e) =>
                  toast.error(
                    e instanceof Error ? e.message : 'Could not generate PDF',
                  ),
                )
              }
            >
              <FileText className="h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openPrintDocument(`/print/transfer/${t.id}`)}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={printBarcodes}>
              <BarcodeIcon className="h-4 w-4" /> Print Barcodes
            </Button>
            {t.attachmentUrl ? (
              <a href={t.attachmentUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4" /> Attachment
                </Button>
              </a>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/transfers/edit/${t.id}`)}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        {/* Header: meta grid + barcode/QR */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <Field label="Reference" value={t.reference} />
            <Field label="Date" value={new Date(t.date).toLocaleString()} />
            <Field label="Status" value={t.status} />
            <Field label="From warehouse" value={branchName(t.fromBranchId)} />
            <Field label="To warehouse" value={branchName(t.toBranchId)} />
            <Field label="From department" value={t.fromDepartment ?? '—'} />
            <Field label="To department" value={t.toDepartment ?? '—'} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Barcode value={t.reference} />
            <QrCode value={`${window.location.origin}/transfers/view/${t.id}`} size={88} />
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-2">Product (Code)</th>
                <th className="p-2">Batch / Serial</th>
                <th className="p-2">Expiry</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2 text-right">MRP</th>
                <th className="p-2">HSN</th>
                <th className="p-2 text-right">Tax</th>
                <th className="p-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {t.items.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="p-2">
                    {i.productName}
                    {i.productCode ? (
                      <span className="text-muted-foreground"> ({i.productCode})</span>
                    ) : null}
                  </td>
                  <td className="p-2">{i.batchNo ?? i.productSerial ?? '—'}</td>
                  <td className="p-2">
                    {i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-2 text-right tabular-nums">{Number(i.quantity)}</td>
                  <td className="p-2 text-right tabular-nums">{money(i.rate)}</td>
                  <td className="p-2 text-right tabular-nums">{money(i.mrp)}</td>
                  <td className="p-2">{i.hsnCode ?? '—'}</td>
                  <td className="p-2 text-right tabular-nums">{money(i.taxAmount)}</td>
                  <td className="p-2 text-right tabular-nums">{money(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <Line label="Total" value={money(t.total)} />
          <Line label="Product tax" value={money(t.totalTax)} />
          <Line label="Shipping" value={money(t.shipping)} />
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums">{money(t.grandTotal)}</span>
          </div>
        </div>

        {t.note ? (
          <div className="rounded-lg border p-4 text-sm">
            <span className="font-semibold">Note: </span>
            {t.note}
          </div>
        ) : null}
      </div>
    </EzhtSkin>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
