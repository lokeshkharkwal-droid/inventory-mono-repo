import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EzhtSkin } from '@/components/shared/EzhtSkin';
import { openPrintDocument } from '@/lib/print';
import { cn } from '@/lib/utils';
import { useQuote, type QuoteDetail } from '@/features/quotes/api';

/** Quote detail / view page (EZ Health Track `quotes/view`). */
export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useQuote(id);

  if (isLoading || !data) {
    return (
      <EzhtSkin title="Quote Details">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </EzhtSkin>
    );
  }
  const q = data as QuoteDetail;
  const isPurchase = q.type === 'PURCHASE';
  const converted = q.status === 'CONVERTED';

  const printPdf = async () => {
    const ok = await openPrintDocument(`/print/quote/${q.id}`);
    if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
  };

  return (
    <EzhtSkin title={`Quote ${q.reference}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={printPdf}>
              <Printer className="h-4 w-4" /> Download PDF
            </Button>
            {!converted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    isPurchase
                      ? `/quotes/purchases/edit/${q.id}`
                      : `/quotes/edit/${q.id}`,
                  )
                }
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {!converted && (
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    isPurchase
                      ? `/purchases/add?fromQuote=${q.id}`
                      : `/sales/add?fromQuote=${q.id}`,
                  )
                }
              >
                {isPurchase ? 'Create Purchase' : 'Create Invoice'}
              </Button>
            )}
          </div>
        </div>

        {/* Header grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Reference" value={q.reference} />
          <Field label="Date" value={new Date(q.date).toLocaleDateString()} />
          <Field label="Type" value={q.type} />
          <Field label="Status" value={q.status === 'DRAFT' ? 'Pending' : q.status} />
          <Field
            label={isPurchase ? 'Supplier' : 'Customer'}
            value={q.party?.name ?? '—'}
          />
          <Field label="Source Branch" value={q.warehouse?.name ?? '—'} />
          {q.party?.phone ? <Field label="Phone" value={q.party.phone} /> : null}
          {q.party?.email ? <Field label="Email" value={q.party.email} /> : null}
          {q.gstNumber ? <Field label="GST No" value={q.gstNumber} /> : null}
          {q.createdByName ? (
            <Field label="Created by" value={q.createdByName} />
          ) : null}
        </div>

        {/* Referral */}
        {q.referralInfo ? (
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-semibold">Referral</h3>
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <Field label="Source" value={q.referralInfo.sourceType ?? '—'} />
              <Field
                label="Contact"
                value={
                  [
                    q.referralInfo.contactFname,
                    q.referralInfo.contactMname,
                    q.referralInfo.contactLname,
                  ]
                    .filter(Boolean)
                    .join(' ') || '—'
                }
              />
              <Field
                label="Business"
                value={q.referralInfo.businessName ?? '—'}
              />
            </div>
          </div>
        ) : null}

        {/* Items */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-2">Product (Code)</th>
                <th className="p-2 text-right">Net Unit Price</th>
                <th className="p-2 text-right">Quantity</th>
                <th className="p-2 text-right">Discount</th>
                <th className="p-2 text-right">Tax</th>
                <th className="p-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="p-2">
                    {i.productName}
                    {i.productCode ? (
                      <span className="text-muted-foreground"> ({i.productCode})</span>
                    ) : null}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {Number(i.netUnitPrice).toFixed(2)}
                  </td>
                  <td className="p-2 text-right tabular-nums">{Number(i.quantity)}</td>
                  <td className="p-2 text-right tabular-nums">
                    {Number(i.discount).toFixed(2)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {Number(i.taxAmount).toFixed(2)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {Number(i.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <Line label="Items" value={q.totalItems} />
          <Line label="Total" value={q.subtotal} money />
          <Line label="Product discount" value={q.productDiscount} money />
          <Line label="Order discount" value={q.orderDiscount} money />
          <Line label="Tax" value={q.totalTax} money />
          <Line label="Shipping" value={q.shipping} money />
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums">{Number(q.grandTotal).toFixed(2)}</span>
          </div>
        </div>

        {q.note ? (
          <div className="rounded-lg border p-4 text-sm">
            <span className="font-semibold">Note: </span>
            {q.note}
          </div>
        ) : null}

        {/* Status history */}
        {q.statusHistory.length > 0 ? (
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Status history</h3>
            <ol className="space-y-2 text-sm">
              {q.statusHistory.map((h) => (
                <li key={h.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                      'bg-muted',
                    )}
                  >
                    {h.status === 'DRAFT' ? 'Pending' : h.status}
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

function Line({
  label,
  value,
  money,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        {money ? Number(value).toFixed(2) : Math.round(Number(value))}
      </span>
    </div>
  );
}
