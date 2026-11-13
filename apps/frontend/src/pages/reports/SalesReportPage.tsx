import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  TextFilter,
  WarehouseFilter,
  CustomerFilter,
  CategoryFilter,
  ProductFilter,
  SelectFilter,
} from '@/features/reports/filters';

interface SaleRow {
  id: string;
  date: string;
  reference: string;
  billerName: string | null;
  customerName: string;
  productsLabel: string;
  investigations: string[] | null;
  paymentsLabel: string;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  paid: number;
  balance: number;
  paymentStatus: string;
}
interface SalesResp {
  rows: SaleRow[];
  totals: {
    totalTax: number;
    totalDiscount: number;
    grandTotal: number;
    paid: number;
    balance: number;
  };
}

/**
 * Sales Report — one row per sales invoice over a date range, with a footer
 * totals row and CSV/PDF export. This is the canonical "filtered list report"
 * template the other list-style reports follow.
 */
export function SalesReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reference, setReference] = useState('');
  const [billerName, setBillerName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const params = {
    from,
    to,
    customerId,
    warehouseId,
    reference,
    billerName,
    categoryId,
    productId,
    paymentStatus,
  };
  const { data, isLoading } = useReport<SalesResp>('sales', '/reports/sales', params);
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<SaleRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'reference', header: 'Reference', value: (r) => r.reference },
    { key: 'biller', header: 'Biller', value: (r) => r.billerName ?? '—' },
    { key: 'customer', header: 'Customer', value: (r) => r.customerName },
    {
      key: 'products',
      header: 'Product (Qty)',
      value: (r) => r.productsLabel,
      render: (r) => (
        <span className="whitespace-pre-line text-xs">{r.productsLabel}</span>
      ),
    },
    {
      key: 'investigations',
      header: 'Investigations',
      value: (r) => (r.investigations?.length ? r.investigations.join('\n') : '—'),
      render: (r) => (
        <span className="whitespace-pre-line text-xs">
          {r.investigations?.length ? r.investigations.join('\n') : '—'}
        </span>
      ),
    },
    {
      key: 'payments',
      header: 'Payments',
      value: (r) => r.paymentsLabel || '—',
      render: (r) => (
        <span className="whitespace-pre-line text-xs">{r.paymentsLabel || '—'}</span>
      ),
    },
    { key: 'tax', header: 'Total Tax', align: 'right', value: (r) => fmtMoney(r.totalTax) },
    { key: 'discount', header: 'Discount', align: 'right', value: (r) => fmtMoney(r.totalDiscount) },
    { key: 'grand', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
    { key: 'paid', header: 'Paid', align: 'right', value: (r) => fmtMoney(r.paid) },
    { key: 'balance', header: 'Balance', align: 'right', value: (r) => fmtMoney(r.balance) },
    { key: 'status', header: 'Status', value: (r) => r.paymentStatus },
  ];

  const totalsRow = totals
    ? ['Total', '', '', '', '', '', '', fmtMoney(totals.totalTax), fmtMoney(totals.totalDiscount), fmtMoney(totals.grandTotal), fmtMoney(totals.paid), fmtMoney(totals.balance), '']
    : undefined;

  return (
    <ReportShell
      title="Sales Report"
      description="Every sales invoice with tax, discount, paid and balance."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter label="Reference" value={reference} onChange={setReference} placeholder="INV-…" />
          <TextFilter label="Biller" value={billerName} onChange={setBillerName} />
          <CategoryFilter value={categoryId} onChange={setCategoryId} />
          <ProductFilter value={productId} onChange={setProductId} />
          <SelectFilter
            label="Payment Status"
            value={paymentStatus}
            onChange={setPaymentStatus}
            options={[
              { value: 'PAID', label: 'Paid' },
              { value: 'PARTIAL', label: 'Partial' },
              { value: 'PENDING', label: 'Pending' },
            ]}
          />
        </>
      }
      exportConfig={{
        filename: 'sales-report',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Invoices" value={rows.length} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
        <StatCard label="Paid" value={fmtMoney(totals?.paid)} />
        <StatCard label="Balance due" value={fmtMoney(totals?.balance)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No sales in range."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
