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
  ProductFilter,
} from '@/features/reports/filters';

interface SalesTaxRow {
  saleId: string;
  date: string;
  reference: string;
  billerName: string | null;
  customerName: string;
  productsLabel: string;
  investigations: string[];
  paymentsLabel: string;
  grandTotal: number;
  productTax: number;
  igst: number;
  cgst: number;
  sgst: number;
}
interface SalesTaxResp {
  rows: SalesTaxRow[];
  totals: {
    grandTotal: number;
    productTax: number;
    igst: number;
    cgst: number;
    sgst: number;
  };
  page: number;
  limit: number;
  total: number;
  from: string | null;
  to: string | null;
}

/**
 * Sales Tax Report — per-invoice output-GST register: one row per sale with its
 * date, reference, biller, customer, products, payments, grand total and the
 * tax split (product tax, IGST, CGST, SGST). Footer sums the five money columns.
 *
 * Documented data gaps (kept visible, rendered as dashes/empty): the legacy
 * "Investigations" column has no inventory-schema source; IGST/CGST/SGST are
 * derived from orderTax (IGST = 0, CGST = SGST = productTax / 2) because
 * per-sale GST splits are not stored.
 */
export function SalesTaxPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reference, setReference] = useState('');
  const [productId, setProductId] = useState('');
  const [billerName, setBillerName] = useState('');

  const params = {
    from,
    to,
    customerId,
    warehouseId,
    reference,
    productId,
    billerName,
  };
  const { data, isLoading } = useReport<SalesTaxResp>(
    'sales-tax',
    '/reports/sales-tax',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<SalesTaxRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'reference', header: 'Reference No', value: (r) => r.reference },
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
      value: (r) => r.investigations.join('\n'),
      render: (r) => (
        <span className="whitespace-pre-line text-xs">
          {r.investigations.length ? r.investigations.join('\n') : '—'}
        </span>
      ),
    },
    {
      key: 'payments',
      header: 'Payments',
      value: (r) => r.paymentsLabel || '—',
      render: (r) => (
        <span className="whitespace-pre-line text-xs">
          {r.paymentsLabel || '—'}
        </span>
      ),
    },
    {
      key: 'grand',
      header: 'Grand Total',
      align: 'right',
      value: (r) => fmtMoney(r.grandTotal),
    },
    {
      key: 'productTax',
      header: 'Product Tax',
      align: 'right',
      value: (r) => fmtMoney(r.productTax),
    },
    { key: 'igst', header: 'IGST', align: 'right', value: (r) => fmtMoney(r.igst) },
    { key: 'cgst', header: 'CGST', align: 'right', value: (r) => fmtMoney(r.cgst) },
    { key: 'sgst', header: 'SGST', align: 'right', value: (r) => fmtMoney(r.sgst) },
  ];

  const totalsRow = totals
    ? [
        'Total',
        '',
        '',
        '',
        '',
        '',
        '',
        fmtMoney(totals.grandTotal),
        fmtMoney(totals.productTax),
        fmtMoney(totals.igst),
        fmtMoney(totals.cgst),
        fmtMoney(totals.sgst),
      ]
    : undefined;

  return (
    <ReportShell
      title="Sales Tax Report"
      description="Per-invoice output-GST register with grand total, product tax and the IGST/CGST/SGST split."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <ProductFilter value={productId} onChange={setProductId} />
          <TextFilter
            label="Reference"
            value={reference}
            onChange={setReference}
            placeholder="INV-…"
          />
          <TextFilter
            label="Biller"
            value={billerName}
            onChange={setBillerName}
            placeholder="Biller name…"
          />
        </>
      }
      exportConfig={{
        filename: 'sales-tax-report',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Invoices" value={rows.length} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
        <StatCard label="Product tax" value={fmtMoney(totals?.productTax)} />
        <StatCard
          label="CGST + SGST"
          value={fmtMoney((totals?.cgst ?? 0) + (totals?.sgst ?? 0))}
          hint="IGST = 0 (intra-state); split derived from order tax"
        />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.saleId}
        isLoading={isLoading}
        emptyMessage="No sales in range."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
