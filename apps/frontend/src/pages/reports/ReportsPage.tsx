import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { exportCsv } from '@/lib/csv';
import {
  useSalesSummary,
  usePurchaseSummary,
  useProfit,
  useTaxSummary,
  usePaymentsSummary,
  useProductSales,
  useLowStock,
  useExpiry,
  useGstr1,
  useGstr3b,
  useProfitLoss,
  useTopCustomers,
  useTopSuppliers,
  useStockByCategory,
  useSalesDaily,
  useSalesByUser,
  useSalesByBrand,
  useFinancialStatement,
  type ProductSalesRow,
  type LowStockRow,
  type ExpiryRow,
  type GstRateRow,
} from '@/features/reports/api';

const n = (v?: number) => (v ?? 0).toFixed(2);

/** Small CSV export button for a report table. */
function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Download className="h-4 w-4" /> CSV
    </Button>
  );
}

/** Reports & analytics: date-range KPIs + alert tables. */
export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const range = { from, to };

  const sales = useSalesSummary(range);
  const purchases = usePurchaseSummary(range);
  const profit = useProfit(range);
  const tax = useTaxSummary(range);
  const payments = usePaymentsSummary(range);
  const topProducts = useProductSales(range);
  const lowStock = useLowStock();
  const expiry = useExpiry(30);
  const gstr1 = useGstr1(range);
  const gstr3b = useGstr3b(range);
  const pnl = useProfitLoss(range);
  const topCustomers = useTopCustomers(range);
  const topSuppliers = useTopSuppliers(range);
  const stockByCat = useStockByCategory();
  const salesDaily = useSalesDaily(range);
  const salesByUser = useSalesByUser(range);
  const salesByBrand = useSalesByBrand(range);
  const financial = useFinancialStatement(range);

  const gstCols: Column<GstRateRow>[] = [
    { key: 'rate', header: 'Rate %', render: (r) => n(r.rate) },
    { key: 'taxableValue', header: 'Taxable', render: (r) => n(r.taxableValue) },
    { key: 'cgst', header: 'CGST', render: (r) => n(r.cgst) },
    { key: 'sgst', header: 'SGST', render: (r) => n(r.sgst) },
    { key: 'igst', header: 'IGST', render: (r) => n(r.igst) },
    { key: 'taxAmount', header: 'Total tax', render: (r) => n(r.taxAmount) },
  ];

  const productCols: Column<ProductSalesRow>[] = [
    { key: 'productName', header: 'Product' },
    { key: 'quantity', header: 'Qty', render: (r) => r.quantity },
    { key: 'revenue', header: 'Revenue', render: (r) => n(r.revenue) },
  ];
  const lowStockCols: Column<LowStockRow>[] = [
    { key: 'name', header: 'Product' },
    { key: 'code', header: 'Code' },
    { key: 'totalQuantity', header: 'On hand', render: (r) => r.totalQuantity },
    { key: 'alertQuantity', header: 'Reorder at', render: (r) => r.alertQuantity },
  ];
  const expiryCols: Column<ExpiryRow>[] = [
    { key: 'product', header: 'Product', render: (r) => r.product?.name ?? '—' },
    { key: 'batchNo', header: 'Batch', render: (r) => r.batchNo ?? '—' },
    {
      key: 'expiryDate',
      header: 'Expires',
      render: (r) => new Date(r.expiryDate).toLocaleDateString(),
    },
    { key: 'quantity', header: 'Qty', render: (r) => r.quantity },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Sales, purchases, tax, and stock alerts.</p>
        </div>
        <div className="flex gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={n(sales.data?.gross)} hint={`${sales.data?.count ?? 0} invoices · due ${n(sales.data?.due)}`} />
        <StatCard label="Purchases" value={n(purchases.data?.gross)} hint={`${purchases.data?.count ?? 0} orders · due ${n(purchases.data?.due)}`} />
        <StatCard label="Gross profit" value={n(profit.data?.profit)} hint={`COGS ${n(profit.data?.cogs)}`} />
        <StatCard label="Net tax payable" value={n(tax.data?.netPayable)} hint={`out ${n(tax.data?.outputTax)} · in ${n(tax.data?.inputTax)}`} />
        <StatCard label="Payments received" value={n(payments.data?.received)} />
        <StatCard label="Payments made" value={n(payments.data?.made)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top products by revenue</CardTitle>
          <ExportButton
            onClick={() =>
              exportCsv('top-products.csv', topProducts.data ?? [], [
                { key: 'productName', header: 'Product' },
                { key: 'quantity', header: 'Qty' },
                { key: 'revenue', header: 'Revenue' },
              ])
            }
          />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={productCols}
            rows={topProducts.data ?? []}
            rowKey={(r) => r.productId}
            isLoading={topProducts.isLoading}
            emptyMessage="No sales in range."
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low stock</CardTitle>
            <ExportButton
              onClick={() =>
                exportCsv('low-stock.csv', lowStock.data ?? [], [
                  { key: 'name', header: 'Product' },
                  { key: 'code', header: 'Code' },
                  { key: 'totalQuantity', header: 'On hand' },
                  { key: 'alertQuantity', header: 'Reorder at' },
                ])
              }
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={lowStockCols}
              rows={lowStock.data ?? []}
              rowKey={(r) => r.id}
              isLoading={lowStock.isLoading}
              emptyMessage="Nothing below reorder level."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expiring within 30 days</CardTitle>
            <ExportButton
              onClick={() =>
                exportCsv(
                  'expiring.csv',
                  (expiry.data ?? []).map((r) => ({
                    product: r.product?.name ?? '',
                    batchNo: r.batchNo ?? '',
                    expiryDate: r.expiryDate,
                    quantity: r.quantity,
                  })),
                )
              }
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={expiryCols}
              rows={expiry.data ?? []}
              rowKey={(r) => r.id}
              isLoading={expiry.isLoading}
              emptyMessage="No near-expiry batches."
            />
          </CardContent>
        </Card>
      </div>

      {/* ── GST / GSTR ── */}
      <h2 className="pt-2 text-lg font-semibold">GST</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Outward tax (GSTR-1)"
          value={n(gstr3b.data?.outward.taxAmount)}
          hint={`Taxable ${n(gstr3b.data?.outward.taxableValue)}`}
        />
        <StatCard
          label="Input tax credit (GSTR-2)"
          value={n(gstr3b.data?.inwardItc.taxAmount)}
          hint={`Taxable ${n(gstr3b.data?.inwardItc.taxableValue)}`}
        />
        <StatCard
          label="Net GST payable (3B)"
          value={n(gstr3b.data?.netPayable)}
        />
        <StatCard label="Net profit (P&L)" value={n(pnl.data?.netProfit)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>GSTR-1 — outward supplies by rate</CardTitle>
          <ExportButton
            onClick={() =>
              exportCsv('gstr1.csv', gstr1.data?.rows ?? [], [
                { key: 'rate', header: 'Rate %' },
                { key: 'taxableValue', header: 'Taxable' },
                { key: 'cgst', header: 'CGST' },
                { key: 'sgst', header: 'SGST' },
                { key: 'igst', header: 'IGST' },
                { key: 'taxAmount', header: 'Total tax' },
              ])
            }
          />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={gstCols}
            rows={gstr1.data?.rows ?? []}
            rowKey={(r) => String(r.rate)}
            isLoading={gstr1.isLoading}
            emptyMessage="No outward supplies in range."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profit &amp; Loss</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm lg:grid-cols-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revenue</span>
            <span>{n(pnl.data?.revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">COGS</span>
            <span>{n(pnl.data?.cogs)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Gross profit</span>
            <span>{n(pnl.data?.grossProfit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expenses</span>
            <span>{n(pnl.data?.expenses)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Other income</span>
            <span>{n(pnl.data?.otherIncome)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Net profit</span>
            <span>{n(pnl.data?.netProfit)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Business reports ── */}
      <h2 className="pt-2 text-lg font-semibold">Business reports</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top customers</CardTitle>
            <ExportButton
              onClick={() =>
                exportCsv('top-customers.csv', topCustomers.data ?? [], [
                  { key: 'customerName', header: 'Customer' },
                  { key: 'orders', header: 'Orders' },
                  { key: 'gross', header: 'Gross' },
                  { key: 'paid', header: 'Paid' },
                ])
              }
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'customerName', header: 'Customer', render: (r) => r.customerName ?? '—' },
                { key: 'orders', header: 'Orders', render: (r) => r.orders },
                { key: 'gross', header: 'Gross', render: (r) => n(r.gross) },
              ]}
              rows={topCustomers.data ?? []}
              rowKey={(r) => r.customerId ?? Math.random().toString()}
              isLoading={topCustomers.isLoading}
              emptyMessage="No sales in range."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top suppliers</CardTitle>
            <ExportButton
              onClick={() =>
                exportCsv('top-suppliers.csv', topSuppliers.data ?? [], [
                  { key: 'supplierName', header: 'Supplier' },
                  { key: 'orders', header: 'Orders' },
                  { key: 'gross', header: 'Gross' },
                  { key: 'paid', header: 'Paid' },
                ])
              }
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'supplierName', header: 'Supplier', render: (r) => r.supplierName ?? '—' },
                { key: 'orders', header: 'Orders', render: (r) => r.orders },
                { key: 'gross', header: 'Gross', render: (r) => n(r.gross) },
              ]}
              rows={topSuppliers.data ?? []}
              rowKey={(r) => r.supplierId ?? Math.random().toString()}
              isLoading={topSuppliers.isLoading}
              emptyMessage="No purchases in range."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Stock value by category</CardTitle>
            <ExportButton
              onClick={() =>
                exportCsv('stock-by-category.csv', stockByCat.data ?? [], [
                  { key: 'name', header: 'Category' },
                  { key: 'quantity', header: 'Quantity' },
                  { key: 'value', header: 'Value' },
                ])
              }
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'name', header: 'Category' },
                { key: 'quantity', header: 'Qty', render: (r) => n(r.quantity) },
                { key: 'value', header: 'Value', render: (r) => n(r.value) },
              ]}
              rows={stockByCat.data ?? []}
              rowKey={(r) => r.name}
              isLoading={stockByCat.isLoading}
              emptyMessage="No stock."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales by staff</CardTitle>
            <ExportButton
              onClick={() =>
                exportCsv('sales-by-staff.csv', salesByUser.data ?? [], [
                  { key: 'userId', header: 'User' },
                  { key: 'orders', header: 'Orders' },
                  { key: 'gross', header: 'Gross' },
                ])
              }
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'userId', header: 'User', render: (r) => r.userId.slice(0, 8) },
                { key: 'orders', header: 'Orders', render: (r) => r.orders },
                { key: 'gross', header: 'Gross', render: (r) => n(r.gross) },
              ]}
              rows={salesByUser.data ?? []}
              rowKey={(r) => r.userId}
              isLoading={salesByUser.isLoading}
              emptyMessage="No sales in range."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daily sales</CardTitle>
          <ExportButton
            onClick={() =>
              exportCsv('daily-sales.csv', salesDaily.data ?? [], [
                { key: 'day', header: 'Day' },
                { key: 'count', header: 'Invoices' },
                { key: 'total', header: 'Total' },
              ])
            }
          />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'day', header: 'Day' },
              { key: 'count', header: 'Invoices', render: (r) => r.count },
              { key: 'total', header: 'Total', render: (r) => n(r.total) },
            ]}
            rows={salesDaily.data ?? []}
            rowKey={(r) => r.day}
            isLoading={salesDaily.isLoading}
            emptyMessage="No sales in range."
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales by brand</CardTitle>
            <ExportButton
              onClick={() =>
                exportCsv('sales-by-brand.csv', salesByBrand.data ?? [], [
                  { key: 'name', header: 'Brand' },
                  { key: 'quantity', header: 'Qty' },
                  { key: 'revenue', header: 'Revenue' },
                ])
              }
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'name', header: 'Brand' },
                { key: 'quantity', header: 'Qty', render: (r) => n(r.quantity) },
                { key: 'revenue', header: 'Revenue', render: (r) => n(r.revenue) },
              ]}
              rows={salesByBrand.data ?? []}
              rowKey={(r) => r.name}
              isLoading={salesByBrand.isLoading}
              emptyMessage="No sales in range."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial statement</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue</span>
              <span>{n(financial.data?.revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">COGS</span>
              <span>{n(financial.data?.cogs)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Gross profit</span>
              <span>{n(financial.data?.grossProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses</span>
              <span>{n(financial.data?.expenses)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Other income</span>
              <span>{n(financial.data?.otherIncome)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Net profit</span>
              <span>{n(financial.data?.netProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payments received</span>
              <span>{n(financial.data?.paymentsReceived)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payments made</span>
              <span>{n(financial.data?.paymentsMade)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net tax payable</span>
              <span>{n(financial.data?.netTaxPayable)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
