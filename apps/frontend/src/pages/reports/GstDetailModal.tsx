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
import { useSale, useAddSalePayment, useDeleteSale } from '@/features/sales/api';
import { fmtMoney, fmtQty, fmtDate } from '@/features/reports/types';
import { LottieLoader } from '@/components/LottieLoader';

interface Props {
  /** Sale id to show; `null` closes the modal. */
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
}

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/**
 * GST report invoice-detail modal (legacy `sales/modal_view`). Opened by clicking
 * a GST-report row, it shows the From/To parties, the invoice line items
 * (Description / Quantity / Unit / Sales / Subtotal) and totals, plus the three
 * legacy actions — Add Payment, Email and PDF — all wired to existing endpoints
 * (`POST /sales/:id/payments`, `POST /print/email`, `GET /print/sale/:id`).
 */
export function GstDetailModal({ saleId, onOpenChange }: Props) {
  const open = !!saleId;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sale, isLoading } = useSale(saleId);
  const addPayment = useAddSalePayment(saleId ?? '');
  const deleteSale = useDeleteSale();
  const [showPayment, setShowPayment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    date: '',
    note: '',
  });

  const balance = sale ? sale.grandTotal - sale.paid : 0;

  const submitPayment = async () => {
    if (!saleId || !form.amount) {
      toast.error('Amount is required.');
      return;
    }
    try {
      await addPayment.mutateAsync({
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || undefined,
        date: form.date || undefined,
        note: form.note || undefined,
      });
      toast.success('Payment recorded');
      setForm({ amount: '', method: 'CASH', reference: '', date: '', note: '' });
      setShowPayment(false);
      void qc.invalidateQueries({ queryKey: ['reports'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record payment'));
    }
  };

  const downloadPdf = async () => {
    if (!saleId) return;
    setPdfBusy(true);
    try {
      const ok = await openPrintDocument(`/print/sale/${saleId}`);
      if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not open the invoice PDF'));
    } finally {
      setPdfBusy(false);
    }
  };

  const doDelete = async () => {
    if (!saleId) return;
    try {
      await deleteSale.mutateAsync(saleId);
      toast.success('Invoice deleted');
      setConfirmDelete(false);
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['reports'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete the invoice'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Invoice {sale?.reference ? `— ${sale.reference}` : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !sale ? (
          <LottieLoader size={64} />
        ) : (
          <div className="space-y-5 text-sm">
            {/* Reference barcode + QR + invoice meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex flex-col gap-0.5 text-muted-foreground">
                <span>Date: {fmtDate(sale.date)}</span>
                <span>Status: {sale.status}</span>
                <span>Payment: {sale.paymentStatus}</span>
              </div>
              <div className="flex items-center gap-4">
                {sale.reference && <Barcode value={sale.reference} />}
                {sale.reference && <QrCode value={sale.reference} size={72} />}
              </div>
            </div>

            {/* From / To */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  From
                </div>
                <div className="font-medium">{sale.warehouse?.name ?? sale.billerName ?? '—'}</div>
                {sale.billerName && sale.warehouse?.name && (
                  <div className="text-muted-foreground">Biller: {sale.billerName}</div>
                )}
                {sale.warehouse?.address && (
                  <div className="text-muted-foreground">{sale.warehouse.address}</div>
                )}
                {(sale.warehouse?.gstNumber ?? sale.gstState) && (
                  <div className="text-muted-foreground">
                    {sale.warehouse?.gstNumber
                      ? `GST: ${sale.warehouse.gstNumber}`
                      : sale.gstState}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  To
                </div>
                <div className="font-medium">{sale.customer?.name ?? '—'}</div>
                {sale.customer?.phone && (
                  <div className="text-muted-foreground">{sale.customer.phone}</div>
                )}
                {sale.customer?.email && (
                  <div className="text-muted-foreground">{sale.customer.email}</div>
                )}
                {(sale.gstNumber ?? sale.customer?.gstNo) && (
                  <div className="text-muted-foreground">
                    GST: {sale.gstNumber ?? sale.customer?.gstNo}
                  </div>
                )}
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
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Sales</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((it, i) => (
                    <tr key={it.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {it.productName}
                          {it.productCode ? ` (${it.productCode})` : ''}
                        </div>
                        {(it.serialNo || it.hsnCode || it.expiryDate) && (
                          <div className="text-xs text-muted-foreground">
                            {[
                              it.serialNo ? `Batch/Serial: ${it.serialNo}` : null,
                              it.hsnCode ? `HSN: ${it.hsnCode}` : null,
                              it.expiryDate ? `Expiry: ${fmtDate(it.expiryDate)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                        {it.productCode && (
                          <div className="mt-1">
                            <Barcode value={it.productCode} height={28} moduleWidth={1.1} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtQty(it.quantity)}
                      </td>
                      <td className="px-3 py-2">{it.unit ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtMoney(it.realUnitPrice || it.price)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtMoney(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotals / totals */}
            <div className="ml-auto w-full max-w-xs space-y-1">
              <Row label="Subtotal" value={fmtMoney(sale.subtotal)} />
              <Row label="Product Tax" value={fmtMoney(sale.totalTax)} />
              {sale.igst > 0 && <Row label="IGST" value={fmtMoney(sale.igst)} />}
              {sale.cgst > 0 && <Row label="CGST" value={fmtMoney(sale.cgst)} />}
              {sale.sgst > 0 && <Row label="SGST" value={fmtMoney(sale.sgst)} />}
              {sale.orderDiscount > 0 && (
                <Row label="Discount" value={`- ${fmtMoney(sale.orderDiscount)}`} />
              )}
              {sale.shipping > 0 && (
                <Row label="Shipping" value={fmtMoney(sale.shipping)} />
              )}
              <Row label="Grand Total" value={fmtMoney(sale.grandTotal)} bold />
              <Row label="Paid" value={fmtMoney(sale.paid)} />
              <Row label="Balance" value={fmtMoney(balance)} bold />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPayment((s) => !s)}
              >
                {showPayment ? 'Close payment' : 'Add Payment'}
              </Button>
              <EmailDocumentButton
                type="sale"
                id={sale.id}
                defaultTo={sale.customer?.email}
                title="Email invoice"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                loading={pdfBusy}
              >
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/sales/edit/${sale.id}`)}
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
                    loading={deleteSale.isPending}
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
              </div>
            )}

            {/* Existing payments */}
            {sale.payments.length > 0 && (
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
                    {sale.payments.map((p) => (
                      <tr key={p.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2">{fmtDate(p.date)}</td>
                        <td className="px-3 py-2">{p.method}</td>
                        <td className="px-3 py-2">{p.reference ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmtMoney(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes */}
            {sale.note && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Notes
                </div>
                <div className="whitespace-pre-wrap text-muted-foreground">{sale.note}</div>
              </div>
            )}

            {/* Audit trail */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              {sale.createdByName && <span>Created by: {sale.createdByName}</span>}
              <span>Created: {fmtDate(sale.createdAt)}</span>
              {sale.updatedAt !== sale.createdAt && (
                <span>Updated: {fmtDate(sale.updatedAt)}</span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A right-aligned label/value totals line. */
function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? 'font-semibold' : 'text-muted-foreground'}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
