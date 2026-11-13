import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  CategoryFilter,
  ProductFilter,
  WarehouseFilter,
  EntityFilter,
} from '@/features/reports/filters';

interface ProductRow {
  productId: string;
  code: string;
  name: string;
  categoryName: string | null;
  purchasedQty: number;
  purchaseValue: number;
  soldQty: number;
  salesValue: number;
  profit: number;
  balanceQty: number;
  balanceValue: number;
}
interface ProductsResp {
  rows: ProductRow[];
  totals: {
    purchasedQty: number;
    purchaseValue: number;
    soldQty: number;
    salesValue: number;
    profit: number;
    balanceQty: number;
    balanceValue: number;
  };
  range: { from: string | null; to: string | null };
}

/** Render a compound "(qty) value" cell — quantity in parentheses, money bold. */
function compound(qty: number, value: number): string {
  return `(${fmtQty(qty)}) ${fmtMoney(value)}`;
}

/**
 * Products Report — one row per product over an optional date window: quantity
 * purchased, quantity sold, profit (sales − purchase) and current stock-in-hand,
 * with a footer grand-totals row and CSV/PDF export. Purchased / Sold / Stock In
 * Hand render as a compound "(qty) value" cell, matching the legacy report.
 *
 * NOTE (documented data gap): Stock In Hand is current on-hand quantity valued at
 * avgCost (from InventoryWarehouseProduct), independent of the date range — the
 * legacy per-purchase-line remainder has no equivalent in the new schema.
 */
export function ProductsReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const params = { from, to, categoryId, subCategoryId, productId, warehouseId };
  const { data, isLoading } = useReport<ProductsResp>(
    'products',
    '/reports/products',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<ProductRow>[] = [
    { key: 'code', header: 'Product Code', value: (r) => r.code },
    { key: 'name', header: 'Product Name', value: (r) => r.name },
    { key: 'category', header: 'Category', value: (r) => r.categoryName ?? '—' },
    {
      key: 'purchased',
      header: 'Purchased',
      align: 'right',
      value: (r) => compound(r.purchasedQty, r.purchaseValue),
    },
    {
      key: 'sold',
      header: 'Sold',
      align: 'right',
      value: (r) => compound(r.soldQty, r.salesValue),
    },
    {
      key: 'profit',
      header: 'Profit / Loss',
      align: 'right',
      value: (r) => fmtMoney(r.profit),
    },
    {
      key: 'stock',
      header: 'Stock In Hand',
      align: 'right',
      value: (r) => compound(r.balanceQty, r.balanceValue),
    },
  ];

  const totalsRow = totals
    ? [
        'Total',
        '',
        '',
        compound(totals.purchasedQty, totals.purchaseValue),
        compound(totals.soldQty, totals.salesValue),
        fmtMoney(totals.profit),
        compound(totals.balanceQty, totals.balanceValue),
      ]
    : undefined;

  return (
    <ReportShell
      title="Products Report"
      description="Per-product quantity purchased, sold, profit and current stock-in-hand."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <CategoryFilter value={categoryId} onChange={setCategoryId} />
          <EntityFilter
            label="Subcategory"
            value={subCategoryId}
            onChange={setSubCategoryId}
            path="/sub-categories"
            queryKey={['sub-categories']}
          />
          <ProductFilter value={productId} onChange={setProductId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: 'products-report',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={rows.length} />
        <StatCard label="Purchase value" value={fmtMoney(totals?.purchaseValue)} />
        <StatCard label="Sales value" value={fmtMoney(totals?.salesValue)} />
        <StatCard label="Profit / Loss" value={fmtMoney(totals?.profit)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.productId}
        isLoading={isLoading}
        emptyMessage="No products in range."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
