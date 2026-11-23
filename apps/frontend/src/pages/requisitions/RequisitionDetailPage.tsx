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
import { openRequisitionPdf, useRequisition } from '@/features/requisitions/api';

const money = (v: string | number | null | undefined) =>
  v == null ? '0.00' : Number(v).toFixed(2);

/**
 * Requisition detail / view page (EZ Health Track `requisitions/view/:id`): a
 * routable, barcode/QR-bearing view with the full header, from/to branch +
 * department, biller, line items (net unit price / qty / discount / tax /
 * subtotal), totals, status history and the Email / Download PDF / Print / Print
 * Barcodes / Attachment actions.
 */
export function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useRequisition(id);
  const { data: branches } = useBranchOptions();

  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (bid: string | null) => (bid ? (map.get(bid) ?? bid) : '—');
  }, [branches]);

  if (isLoading || !data) {
    return (
      <EzhtSkin title="Requisition Details">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </EzhtSkin>
    );
  }

  const r = data;
  const createdByName =
    r.statusHistory.find((h) => h.status === 'PENDING')?.createdByName ??
    r.statusHistory[0]?.createdByName ??
    null;

  const printBarcodes = () =>
    void openPrintDocumentPost('/print/barcodes', {
      items: r.items
        .filter((i) => i.productId)
        .map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
    });

  return (
    <EzhtSkin title={`Requisition ${r.reference}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <EmailDocumentButton
              type="requisition"
              id={r.id}
              title="Email requisition"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void openRequisitionPdf(r.id).catch((e) =>
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
              onClick={() =>
                void openPrintDocument(`/print/requisition/${r.id}`)
              }
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={printBarcodes}>
              <BarcodeIcon className="h-4 w-4" /> Print Barcodes
            </Button>
            {r.attachmentUrl ? (
              <a href={r.attachmentUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4" /> Attachment
                </Button>
              </a>
            ) : null}
            {r.status === 'PENDING' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/requisitions/edit/${r.id}`)}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            ) : null}
          </div>
        </div>

        {/* Header: meta grid + barcode/QR */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <Field label="Reference" value={r.reference} />
            <Field label="Date" value={new Date(r.date).toLocaleString()} />
            <Field label="Status" value={r.status} />
            <Field label="Source branch" value={branchName(r.fromBranchId)} />
            <Field label="Destination branch" value={branchName(r.branchId)} />
            <Field label="Biller" value={r.billerName ?? '—'} />
            <Field label="From department" value={r.fromDepartmentName ?? '—'} />
            <Field label="To department" value={r.toDepartmentName ?? '—'} />
            <Field label="Local purchase" value={r.localPurchase ? 'Yes' : 'No'} />
            {createdByName ? (
              <Field label="Created by" value={createdByName} />
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-2">
            <Barcode value={r.reference} />
            <QrCode value={`${window.location.origin}/requisitions/view/${r.id}`} size={88} />
          </div>
        </div>

        {/* Referral */}
        {r.referralSourceType || r.referralDoctorName || r.referralBusinessName ? (
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-semibold">Referral</h3>
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <Field label="Source" value={r.referralSourceType ?? '—'} />
              <Field
                label="Contact"
                value={
                  [
                    r.referralContactFname,
                    r.referralContactMname,
                    r.referralContactLname,
                  ]
                    .filter(Boolean)
                    .join(' ') || '—'
                }
              />
              <Field label="Business" value={r.referralBusinessName ?? '—'} />
              <Field label="Doctor" value={r.referralDoctorName ?? '—'} />
            </div>
          </div>
        ) : null}

        {/* Items */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-2">Product (Code)</th>
                <th className="p-2">Batch / Serial</th>
                <th className="p-2">Expiry</th>
                <th className="p-2 text-right">Net Unit Price</th>
                <th className="p-2 text-right">Quantity</th>
                <th className="p-2 text-right">Discount</th>
                <th className="p-2 text-right">Product Tax</th>
                <th className="p-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="p-2">
                    {i.productName}
                    {i.productCode ? (
                      <span className="text-muted-foreground"> ({i.productCode})</span>
                    ) : null}
                  </td>
                  <td className="p-2">{i.batchNo ?? i.serialNo ?? '—'}</td>
                  <td className="p-2">
                    {i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-2 text-right tabular-nums">{money(i.netUnitPrice)}</td>
                  <td className="p-2 text-right tabular-nums">{Number(i.quantity)}</td>
                  <td className="p-2 text-right tabular-nums">{money(i.discount)}</td>
                  <td className="p-2 text-right tabular-nums">{money(i.taxAmount)}</td>
                  <td className="p-2 text-right tabular-nums">{money(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <Line label="Total" value={money(r.subtotal)} />
          <Line label="Product discount" value={money(r.productDiscount)} />
          <Line label="Tax" value={money(r.totalTax)} />
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums">{money(r.grandTotal)}</span>
          </div>
        </div>

        {r.note ? (
          <div className="rounded-lg border p-4 text-sm">
            <span className="font-semibold">Note: </span>
            {r.note}
          </div>
        ) : null}

        {/* Status history */}
        {r.statusHistory.length > 0 ? (
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Status history</h3>
            <ol className="space-y-2 text-sm">
              {r.statusHistory.map((h) => (
                <li key={h.id} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {h.status}
                  </span>
                  <div>
                    <div className="text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()}
                      {h.createdByName ? ` · ${h.createdByName}` : ''}
                    </div>
                    {h.comment ? <div>{h.comment}</div> : null}
                  </div>
                </li>
              ))}
            </ol>
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
