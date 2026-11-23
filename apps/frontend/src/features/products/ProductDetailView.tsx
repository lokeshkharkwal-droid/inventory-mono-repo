import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Pencil, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Barcode } from '@/components/shared/Barcode';
import { QrCode } from '@/components/shared/QrCode';
import { PrintButton } from '@/components/shared/PrintButton';
import { GroupedBarChart } from '@/features/reports/MiniChart';
import { fmtDate, fmtDateTime } from '@/features/reports/types';
import { AdjustmentFormDialog } from './AdjustmentFormDialog';
import {
  useProduct,
  useProductStock,
  useProductChart,
  useProductSales,
  useProductPurchases,
  useProductQuotes,
  useProductTransfers,
  useProductAdjustments,
  useProductBatchDetails,
  type ProductQtyLine,
} from './api';

const money = (v: number | null | undefined) =>
  v == null ? '—' : Number(v).toFixed(2);

/** EZHT "Product Qty" column — one `name (qty)` line per order item. */
function QtyList({ lines }: { lines: ProductQtyLine[] | undefined }) {
  if (!lines || lines.length === 0) return <>—</>;
  return (
    <div className="space-y-0.5">
      {lines.map((l, i) => (
        <div key={i} className="whitespace-nowrap text-xs">
          {l.productName} ({Number(l.quantity)})
        </div>
      ))}
    </div>
  );
}

/** One label/value cell in the details grid. */
function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

const TABS = [
  'Details',
  'Charts',
  'Sales',
  'Quotations',
  'Purchases',
  'Transfers',
  'Adjustments',
  'Batches',
] as const;
type Tab = (typeof TABS)[number];

/** Empty-state table row spanning `cols` columns. */
function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

/**
 * Product Details page (legacy EZHT `products/view`): an 8-panel view of one
 * product — details + warehouse stock, sales/purchases trend charts, and the
 * product's sales, quotations, purchases, transfers, quantity adjustments and
 * batches (full EZHT product-view column parity).
 */
export function ProductDetailView({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('Details');
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data: p, isLoading } = useProduct(productId);
  const { data: stock } = useProductStock(productId);
  const { data: chart } = useProductChart(tab === 'Charts' ? productId : null);
  const { data: sales } = useProductSales(tab === 'Sales' ? productId : null);
  const { data: quotes } = useProductQuotes(
    tab === 'Quotations' ? productId : null,
  );
  const { data: purchases } = useProductPurchases(
    tab === 'Purchases' ? productId : null,
  );
  const { data: transfers } = useProductTransfers(
    tab === 'Transfers' ? productId : null,
  );
  const { data: adjustments } = useProductAdjustments(
    tab === 'Adjustments' ? productId : null,
  );
  const { data: batches } = useProductBatchDetails(
    tab === 'Batches' ? productId : null,
  );

  if (isLoading || !p) {
    return <p className="py-10 text-center text-muted-foreground">Loading…</p>;
  }

  const months = chart?.months ?? [];
  const categories = months.map((m) => m.label);

  return (
    <div className="space-y-5 pb-16">
      {/* Header + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/products')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              {p.code} · {p.type}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton
            path={`/print/product/${productId}/barcode`}
            title="Print barcode"
            variant="outline"
            size="sm"
          >
            Print Barcode
          </PrintButton>
          <PrintButton
            path={`/print/product/${productId}/label`}
            title="Print label"
            variant="outline"
            size="sm"
          >
            Print Label
          </PrintButton>
          <PrintButton
            path={`/print/product/${productId}/label`}
            title="Label printer"
            variant="outline"
            size="sm"
          >
            Label Printer
          </PrintButton>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdjustOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" /> Adjust Quantity
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/products/edit/${productId}`)}
          >
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Details ── */}
      {tab === 'Details' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start gap-8">
            <div className="space-y-2">
              <Barcode value={p.code} />
            </div>
            <QrCode value={p.code} size={96} />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Product Type" value={p.type} />
            <Field label="Product Name" value={p.name} />
            <Field label="Product Code" value={p.code} />
            <Field label="Category" value={p.category?.name} />
            <Field label="Subcategory" value={p.subCategory?.name} />
            <Field label="Product Unit" value={p.unit?.name} />
            <Field label="Pack Cost" value={money(p.packCost)} />
            <Field label="Unit Cost" value={money(p.cost)} />
            <Field label="Pack MRP" value={money(p.packMrp)} />
            <Field label="Unit MRP" value={money(p.price)} />
            <Field label="Sales Method" value={p.salesMethod} />
            <Field label="Alert Quantity" value={p.alertQuantity} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Warehouse-wise stock</p>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">
                      Available Quantity
                    </TableHead>
                    <TableHead>Rack</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stock?.length ?? 0) === 0 ? (
                    <Empty cols={3} text="No stock recorded yet." />
                  ) : (
                    stock!.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">
                          {s.branchId}
                        </TableCell>
                        <TableCell className="text-right">
                          {String(s.quantity)}
                        </TableCell>
                        <TableCell>{s.rack ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      {tab === 'Charts' && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Product Sales</p>
            {months.length ? (
              <GroupedBarChart
                categories={categories}
                series={[
                  { name: 'Qty', data: months.map((m) => m.salesQty) },
                  { name: 'Amount', data: months.map((m) => m.salesAmount) },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No sales data.</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Product Purchases</p>
            {months.length ? (
              <GroupedBarChart
                categories={categories}
                series={[
                  { name: 'Qty', data: months.map((m) => m.purchaseQty) },
                  { name: 'Amount', data: months.map((m) => m.purchaseAmount) },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No purchase data.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Sales ── */}
      {tab === 'Sales' && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Biller</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product Qty</TableHead>
                <TableHead className="text-right">Total Tax</TableHead>
                <TableHead className="text-right">Total Discount</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Payment Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sales?.rows?.length ?? 0) === 0 ? (
                <Empty cols={11} text="No sales for this product." />
              ) : (
                sales!.rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{fmtDateTime(s.date)}</TableCell>
                    <TableCell>{s.reference}</TableCell>
                    <TableCell>{s.billerName ?? '—'}</TableCell>
                    <TableCell>{s.customerName}</TableCell>
                    <TableCell>
                      <QtyList lines={s.products} />
                    </TableCell>
                    <TableCell className="text-right">
                      {money(s.totalTax)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(s.totalDiscount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(s.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right">{money(s.paid)}</TableCell>
                    <TableCell className="text-right">
                      {money(s.balance)}
                    </TableCell>
                    <TableCell>{s.paymentStatus}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Quotations ── */}
      {tab === 'Quotations' && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Biller</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product Qty</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(quotes?.data?.length ?? 0) === 0 ? (
                <Empty cols={7} text="No quotations for this product." />
              ) : (
                quotes!.data.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{fmtDateTime(q.date)}</TableCell>
                    <TableCell>{q.reference}</TableCell>
                    <TableCell>{q.billerName ?? '—'}</TableCell>
                    <TableCell>{q.customerName ?? q.partyName ?? '—'}</TableCell>
                    <TableCell>
                      <QtyList lines={q.products} />
                    </TableCell>
                    <TableCell className="text-right">
                      {money(q.grandTotal)}
                    </TableCell>
                    <TableCell>{q.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Purchases ── */}
      {tab === 'Purchases' && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Product Qty</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(purchases?.rows?.length ?? 0) === 0 ? (
                <Empty cols={9} text="No purchases for this product." />
              ) : (
                purchases!.rows.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell>{fmtDateTime(pr.date)}</TableCell>
                    <TableCell>{pr.reference}</TableCell>
                    <TableCell>{pr.warehouseName ?? '—'}</TableCell>
                    <TableCell>{pr.supplierName}</TableCell>
                    <TableCell>
                      <QtyList lines={pr.items} />
                    </TableCell>
                    <TableCell className="text-right">
                      {money(pr.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(pr.paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(pr.balance)}
                    </TableCell>
                    <TableCell>{pr.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Transfers ── */}
      {tab === 'Transfers' && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Product Qty</TableHead>
                <TableHead>Warehouse (From)</TableHead>
                <TableHead>Warehouse (To)</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(transfers?.rows?.length ?? 0) === 0 ? (
                <Empty cols={7} text="No transfers for this product." />
              ) : (
                transfers!.rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{fmtDateTime(t.date)}</TableCell>
                    <TableCell>{t.reference}</TableCell>
                    <TableCell>
                      <QtyList lines={t.items} />
                    </TableCell>
                    <TableCell>{t.fromWarehouse ?? '—'}</TableCell>
                    <TableCell>{t.toWarehouse ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {money(t.grandTotal)}
                    </TableCell>
                    <TableCell>{t.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Quantity Adjustments ── */}
      {tab === 'Adjustments' && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Product Variant</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Warehouse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(adjustments?.data?.length ?? 0) === 0 ? (
                <Empty cols={6} text="No quantity adjustments for this product." />
              ) : (
                adjustments!.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {fmtDateTime(a.adjustedAt ?? a.createdAt)}
                    </TableCell>
                    <TableCell>{a.productCode ?? '—'}</TableCell>
                    <TableCell>{a.productName ?? '—'}</TableCell>
                    <TableCell>{a.variantName ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {String(a.quantity)}
                    </TableCell>
                    <TableCell>{a.warehouseName ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Batch Details ── */}
      {tab === 'Batches' && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Product Variant</TableHead>
                <TableHead>Serial No</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Pack Size</TableHead>
                <TableHead className="text-right">Pack Cost</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Pack MRP</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">Tax Rate</TableHead>
                <TableHead>HSN Code</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Warehouse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batches?.length ?? 0) === 0 ? (
                <Empty cols={15} text="No batches for this product." />
              ) : (
                batches!.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{fmtDateTime(b.date)}</TableCell>
                    <TableCell>{b.productCode ?? '—'}</TableCell>
                    <TableCell>{b.productName ?? '—'}</TableCell>
                    <TableCell>{b.variantName ?? '—'}</TableCell>
                    <TableCell>{b.serialNo ?? '—'}</TableCell>
                    <TableCell>{fmtDate(b.expiryDate)}</TableCell>
                    <TableCell className="text-right">
                      {b.packSize == null ? '—' : String(b.packSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(b.packCost)}
                    </TableCell>
                    <TableCell className="text-right">{money(b.cost)}</TableCell>
                    <TableCell className="text-right">
                      {money(b.packMrp)}
                    </TableCell>
                    <TableCell className="text-right">{money(b.mrp)}</TableCell>
                    <TableCell className="text-right">
                      {b.taxRate == null ? '—' : String(b.taxRate)}
                    </TableCell>
                    <TableCell>{b.hsnCode ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {String(b.quantity)}
                    </TableCell>
                    <TableCell>{b.warehouseName ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AdjustmentFormDialog
        productId={productId}
        productName={p.name}
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
      />
    </div>
  );
}
