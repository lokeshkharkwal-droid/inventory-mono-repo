import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { Barcode } from '@/components/shared/Barcode';
import { QrCode } from '@/components/shared/QrCode';
import { openPrintDocument } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/http';
import {
  usePurchase,
  useAddPurchasePayment,
  useDeletePurchase,
} from '@/features/purchases/api';
import { fmtMoney, fmtQty, fmtDate } from '@/features/reports/types';
import { LottieLoader } from '@/components/LottieLoader';

interface Props {
  /** Purchase id to show; `null` closes the modal. */
  purchaseId: string | null;
  onOpenChange: (open: boolean) => void;
}

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/**
 * Purchase detail modal (legacy `purchases/modal_view`). Opened by clicking a row
 * on the Purchases / Purchase Age / Purchases Tax reports, it shows the supplier,
 * line items and totals, plus the legacy actions — Add Payment (with conditional
 * Cheque/Card fields), Email, PDF, Edit and Delete — all wired to existing
 * endpoints (`POST /purchases/:id/payments`, `POST /print/email`,
 * `GET /print/purchase/:id`, `PATCH`/`DELETE /purchases/:id`).
 */
export function PurchaseDetailModal({ purchaseId, onOpenChange }: Props) {
  const open = !!purchaseId;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: p, isLoading } = usePurchase(purchaseId);
  const addPayment = useAddPurchasePayment(purchaseId ?? '');
  const deletePurchase = useDeletePurchase();
  const [showPayment, setShowPayment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    date: '',
    chequeNo: '',
    ccNo: '',
    note: '',
  });

  const balance = p ? p.grandTotal - p.paid : 0;

  /** Refresh both the purchases cache and the open report table. */
  const refreshReports = () => {
    void qc.invalidateQueries({ queryKey: ['reports'] });
  };

  const submitPayment = async () => {
    if (!purchaseId || !form.amount) {
      toast.error('Amount is required.');
      return;
    }
    try {
      await addPayment.mutateAsync({
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || undefined,
        date: form.date || undefined,
        chequeNo: form.method === 'CHEQUE' ? form.chequeNo || undefined : undefined,
        ccNo: form.method === 'CARD' ? form.ccNo || undefined : undefined,
        note: form.note || undefined,
      });
      toast.success('Payment recorded');
      setForm({
        amount: '',
        method: 'CASH',
        reference: '',
        date: '',
        chequeNo: '',
        ccNo: '',
        note: '',
      });
      setShowPayment(false);
      refreshReports();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record payment'));
    }
  };

  const downloadPdf = async () => {
    if (!purchaseId) return;
    setPdfBusy(true);
    try {
      const ok = await openPrintDocument(`/print/purchase/${purchaseId}`);
      if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not open the purchase PDF'));
    } finally {
      setPdfBusy(false);
    }
  };

  const doDelete = async () => {
    if (!purchaseId) return;
    try {
      await deletePurchase.mutateAsync(purchaseId);
      toast.success('Purchase deleted');
      setConfirmDelete(false);
      onOpenChange(false);
      refreshReports();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete the purchase'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Purchase {p?.reference ? `— ${p.reference}` : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !p ? (
          <LottieLoader size={64} />
        ) : (
          <div className="space-y-5 text-sm">
            {/* Reference barcode + QR + meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex flex-col gap-0.5 text-muted-foreground">
                <span>Date: {fmtDate(p.date)}</span>
                <span>Status: {p.status}</span>
                <span>Payment: {p.paymentStatus}</span>
              </div>
              <div className="flex items-center gap-4">
                {p.reference && <Barcode value={p.reference} />}
                {p.reference && <QrCode value={p.reference} size={72} />}
              </div>
            </div>

            {/* Supplier + Warehouse */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Supplier
                </div>
                <div className="font-medium">{p.supplier?.name ?? '—'}</div>
                {p.supplier?.companyName && (
                  <div className="text-muted-foreground">{p.supplier.companyName}</div>
                )}
                <PartyLines
                  address={p.supplier?.address}
                  city={p.supplier?.city}
                  state={p.supplier?.state}
                  postalCode={p.supplier?.postalCode}
                  phone={p.supplier?.phone}
                  email={p.supplier?.email}
                  gst={p.supplier?.gstNo ?? p.gstNumber}
                />
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Warehouse
                </div>
                <div className="font-medium">{p.warehouse?.name ?? '—'}</div>
                {p.warehouse?.code && (
                  <div className="text-muted-foreground">{p.warehouse.code}</div>
                )}
                <PartyLines
                  address={p.warehouse?.address}
                  gst={p.warehouse?.gstNumber}
                />
              </div>
            </div>

            {/* Line items */}
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">MRP</th>
                    <th className="px-3 py-2 text-right">Tax</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((it, i) => (
                    <tr key={it.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {it.productName}
                          {it.productCode ? ` (${it.productCode})` : ''}
                        </div>
                        <ItemMeta
                          batchNo={it.batchNo}
                          hsnCode={it.hsnCode}
                          partNo={it.partNo}
                          expiryDate={it.expiryDate}
                          freeQty={it.freePackQuantity}
                        />
                        {it.productCode && (
                          <div className="mt-1">
                            <Barcode value={it.productCode} height={28} moduleWidth={1.1} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtQty(it.quantity)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtMoney(it.realUnitCost || it.cost)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {it.mrp != null ? fmtMoney(it.mrp) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtMoney(it.taxAmount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtMoney(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="ml-auto w-full max-w-xs space-y-1">
              <Row label="Subtotal" value={fmtMoney(p.subtotal)} />
              <Row label="Product Tax" value={fmtMoney(p.totalTax)} />
              {p.igst > 0 && <Row label="IGST" value={fmtMoney(p.igst)} />}
              {p.cgst > 0 && <Row label="CGST" value={fmtMoney(p.cgst)} />}
              {p.sgst > 0 && <Row label="SGST" value={fmtMoney(p.sgst)} />}
              {p.orderDiscount > 0 && (
                <Row label="Discount" value={`- ${fmtMoney(p.orderDiscount)}`} />
              )}
              {p.shipping > 0 && <Row label="Shipping" value={fmtMoney(p.shipping)} />}
              {p.roundoff !== 0 && (
                <Row label="Roundoff" value={fmtMoney(p.roundoff)} />
              )}
              <Row label="Grand Total" value={fmtMoney(p.grandTotal)} bold />
              <Row label="Paid" value={fmtMoney(p.paid)} />
              <Row label="Balance" value={fmtMoney(balance)} bold />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              {balance > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPayment((s) => !s)}
                >
                  {showPayment ? 'Close payment' : 'Add Payment'}
                </Button>
              )}
              <EmailDocumentButton type="purchase" id={p.id} title="Email purchase" />
              <Button variant="outline" size="sm" onClick={downloadPdf} loading={pdfBusy}>
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/purchases/edit/${p.id}`)}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              {confirmDelete ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Are you sure?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={doDelete}
                    loading={deletePurchase.isPending}
                  >
                    Yes, delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    No
                  </Button>
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>

            {/* Add-payment form */}
            {showPayment && (
              <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_auto] items-end gap-2 rounded-lg border border-border/60 p-3">
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <select
                    className={selectCls}
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reference</Label>
                  <Input
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <Button onClick={submitPayment} disabled={addPayment.isPending}>
                  Add
                </Button>
                {form.method === 'CHEQUE' && (
                  <div className="space-y-1.5">
                    <Label>Cheque No</Label>
                    <Input
                      value={form.chequeNo}
                      onChange={(e) => setForm({ ...form, chequeNo: e.target.value })}
                    />
                  </div>
                )}
                {form.method === 'CARD' && (
                  <div className="space-y-1.5">
                    <Label>Card No</Label>
                    <Input
                      value={form.ccNo}
                      onChange={(e) => setForm({ ...form, ccNo: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Existing payments */}
            {p.payments.length > 0 && (
              <div className="rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.payments.map((pay) => (
                      <tr key={pay.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2">{fmtDate(pay.date)}</td>
                        <td className="px-3 py-2">{pay.method}</td>
                        <td className="px-3 py-2">{pay.reference ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmtMoney(pay.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes */}
            {p.note && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Notes
                </div>
                <div className="whitespace-pre-wrap text-muted-foreground">{p.note}</div>
              </div>
            )}

            {/* Audit trail */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              {p.createdByName && <span>Created by: {p.createdByName}</span>}
              <span>Created: {fmtDate(p.createdAt)}</span>
              {p.updatedAt !== p.createdAt && <span>Updated: {fmtDate(p.updatedAt)}</span>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A right-aligned label/value totals line. */
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between ${bold ? 'font-semibold' : 'text-muted-foreground'}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Contact/address/GST sub-lines for a Supplier or Warehouse block. */
function PartyLines({
  address,
  city,
  state,
  postalCode,
  phone,
  email,
  gst,
}: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  gst?: string | null;
}) {
  const place = [city, state, postalCode].filter(Boolean).join(', ');
  return (
    <div className="flex flex-col gap-0.5 text-muted-foreground">
      {address && <span>{address}</span>}
      {place && <span>{place}</span>}
      {phone && <span>{phone}</span>}
      {email && <span>{email}</span>}
      {gst && <span>GST: {gst}</span>}
    </div>
  );
}

/** Batch / HSN / part-no / expiry / free-qty sub-line for a purchase line item. */
function ItemMeta({
  batchNo,
  hsnCode,
  partNo,
  expiryDate,
  freeQty,
}: {
  batchNo?: string | null;
  hsnCode?: string | null;
  partNo?: string | null;
  expiryDate?: string | null;
  freeQty?: number | null;
}) {
  const parts = [
    batchNo ? `Batch: ${batchNo}` : null,
    hsnCode ? `HSN: ${hsnCode}` : null,
    partNo ? `Part No: ${partNo}` : null,
    expiryDate ? `Expiry: ${fmtDate(expiryDate)}` : null,
    freeQty ? `Free: ${fmtQty(freeQty)}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return <div className="text-xs text-muted-foreground">{parts.join(' · ')}</div>;
}
