import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, WarehouseFilter } from '@/features/reports/filters';

interface CountAmount { count: number; amount: number }
interface WarehouseRow {
  branchId: string;
  name: string;
  salesAmount: number;
  salesTax: number;
  purchasesAmount: number;
  purchasesTax: number;
  profit: number;
}
interface PlResp {
  purchases: { total: number; amount: number; paid: number; tax: number };
  sales: { total: number; amount: number; paid: number; tax: number };
  payments: {
    received: CountAmount;
    receivedByMethod: { cash: number; cc: number; cheque: number; paypalPro: number; stripe: number };
    sent: CountAmount;
    returned: CountAmount;
    expenses: CountAmount;
    incomes: CountAmount;
  };
  profitLoss: { gross: number; lessSalesTax: number; netOfTaxBoth: number };
  netPayments: number;
  warehouses: WarehouseRow[];
}

/** A labelled money row inside a statement card. */
function Line({ label, value, strong }: { label: string; value: number | undefined; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{fmtMoney(value)}</span>
    </div>
  );
}

/** Profit and/or Loss — full cash-flow / P&L statement for a date range. */
export function ProfitLossPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<PlResp>('profit-loss', '/reports/profit-loss-report', { from, to, warehouseId });
  const warehouses = data?.warehouses ?? [];
  const pay = data?.payments;

  const wcolumns: ReportColumn<WarehouseRow>[] = [
    { key: 'name', header: 'Warehouse', value: (r) => r.name },
    { key: 'sales', header: 'Sales', align: 'right', value: (r) => fmtMoney(r.salesAmount) },
    { key: 'salesTax', header: 'Sales Tax', align: 'right', value: (r) => fmtMoney(r.salesTax) },
    { key: 'purch', header: 'Purchases', align: 'right', value: (r) => fmtMoney(r.purchasesAmount) },
    { key: 'purchTax', header: 'Purchase Tax', align: 'right', value: (r) => fmtMoney(r.purchasesTax) },
    {
      key: 'profit',
      header: 'Profit / Loss',
      align: 'right',
      value: (r) => fmtMoney(r.profit),
      render: (r) => <span className={r.profit < 0 ? 'text-destructive' : ''}>{fmtMoney(r.profit)}</span>,
    },
  ];

  const summaryRows = data
    ? [
        { label: 'Sales', value: data.sales.amount },
        { label: 'Purchases', value: data.purchases.amount },
        { label: 'Payments received', value: data.payments.received.amount },
        { label: 'Payments made', value: data.payments.sent.amount },
        { label: 'Payments returned', value: data.payments.returned.amount },
        { label: 'Expenses', value: data.payments.expenses.amount },
        { label: 'Incomes', value: data.payments.incomes.amount },
        { label: 'Profit/Loss (gross)', value: data.profitLoss.gross },
        { label: 'Profit/Loss (sales net of tax)', value: data.profitLoss.lessSalesTax },
        { label: 'Profit/Loss (both net of tax)', value: data.profitLoss.netOfTaxBoth },
        { label: 'Net cash flow', value: data.netPayments },
      ]
    : [];
  const summaryColumns: ReportColumn<{ label: string; value: number }>[] = [
    { key: 'metric', header: 'Metric', value: (r) => r.label },
    { key: 'value', header: 'Value', align: 'right', value: (r) => fmtMoney(r.value) },
  ];

  return (
    <ReportShell
      title="Profit and/or Loss"
      description="Sales vs purchases, payments (by method), returns, expenses, incomes and the three profit figures."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: 'profit-and-loss', columns: summaryColumns, rows: summaryRows }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={fmtMoney(data?.sales.amount)} hint={`${data?.sales.total ?? 0} invoices · tax ${fmtMoney(data?.sales.tax)}`} />
        <StatCard label="Purchases" value={fmtMoney(data?.purchases.amount)} hint={`${data?.purchases.total ?? 0} orders · tax ${fmtMoney(data?.purchases.tax)}`} />
        <StatCard label="Gross profit/loss" value={fmtMoney(data?.profitLoss.gross)} />
        <StatCard label="Net profit (both net of tax)" value={fmtMoney(data?.profitLoss.netOfTaxBoth)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Profit &amp; Loss</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Gross (sales − purchases)" value={data?.profitLoss.gross} />
            <Line label="Sales net of its tax" value={data?.profitLoss.lessSalesTax} />
            <Line label="Both net of tax" value={data?.profitLoss.netOfTaxBoth} strong />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payments received</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Total received" value={pay?.received.amount} strong />
            <Line label="Cash" value={pay?.receivedByMethod.cash} />
            <Line label="Card" value={pay?.receivedByMethod.cc} />
            <Line label="Cheque" value={pay?.receivedByMethod.cheque} />
            <Line label="PayPal Pro" value={pay?.receivedByMethod.paypalPro} />
            <Line label="Stripe" value={pay?.receivedByMethod.stripe} />
            <Line label="Returned" value={pay?.returned.amount} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cash flow</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Payments made (purchases)" value={pay?.sent.amount} />
            <Line label="Expenses" value={pay?.expenses.amount} />
            <Line label="Incomes" value={pay?.incomes.amount} />
            <Line label="Net cash flow" value={data?.netPayments} strong />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Per-warehouse breakdown</CardTitle></CardHeader>
        <CardContent>
          <ReportTable
            columns={wcolumns}
            rows={warehouses}
            rowKey={(r) => r.branchId}
            isLoading={isLoading}
            emptyMessage="No activity in range."
            searchable={false}
          />
        </CardContent>
      </Card>
    </ReportShell>
  );
}
