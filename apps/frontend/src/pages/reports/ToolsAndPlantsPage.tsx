import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, WarehouseFilter, TextFilter } from '@/features/reports/filters';

interface ToolsAndPlantsRow {
  id: string;
  date: string | null;
  referenceNo: string | null;
  biller: string | null;
  branchName: string | null;
  sellerName: string | null;
  productName: string;
  quantity: number;
  repairQuantity: number;
  damageQuantity: number;
  balanceQuantity: number;
  unitPrice: number;
  grandTotal: number;
  amcStatus: string | null;
  isZeroStock: boolean;
}
interface ToolsAndPlantsResp {
  rows: ToolsAndPlantsRow[];
  totals: { grandTotal: number };
}

/**
 * Tools & Plants — the low-value slice of the materials asset register (net
 * value below the 1,000,000 threshold), one row per material with damage /
 * balance quantities and a footer Grand Total. A filtered list report with
 * CSV/PDF export, following the Sales Report template.
 *
 * Several legacy columns have no source in the new InventoryMaterial schema
 * (Biller, Branch Name, Seller Name, Repair Quantity, AMC Status, and a true
 * acquisition Date/Reference No) — per the migration spec these return
 * null/0 and render as a dash rather than being hidden or fabricated.
 */
export function ToolsAndPlantsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [category, setCategory] = useState('');
  const [reference, setReference] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const params = { warehouseId, categoryId: category, reference, from, to, search };
  const { data, isLoading } = useReport<ToolsAndPlantsResp>(
    'tools-and-plants',
    '/reports/tools-and-plants',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<ToolsAndPlantsRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'referenceNo', header: 'Reference No', value: (r) => r.referenceNo ?? '—' },
    { key: 'biller', header: 'Biller', value: (r) => r.biller ?? '—' },
    { key: 'branchName', header: 'Branch Name', value: (r) => r.branchName ?? '—' },
    { key: 'sellerName', header: 'Seller Name', value: (r) => r.sellerName ?? '—' },
    { key: 'productName', header: 'Product Name', value: (r) => r.productName },
    { key: 'quantity', header: 'Quantity', align: 'right', value: (r) => fmtQty(r.quantity) },
    {
      key: 'repairQuantity',
      header: 'Repair Quantity',
      align: 'right',
      value: (r) => fmtQty(r.repairQuantity),
    },
    {
      key: 'damageQuantity',
      header: 'Damage Quantity',
      align: 'right',
      value: (r) => fmtQty(r.damageQuantity),
    },
    {
      key: 'balanceQuantity',
      header: 'Balance Quantity',
      align: 'right',
      value: (r) => fmtQty(r.balanceQuantity),
    },
    { key: 'unitPrice', header: 'Unit Price', align: 'right', value: (r) => fmtMoney(r.unitPrice) },
    { key: 'grandTotal', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
    { key: 'amcStatus', header: 'AMC Status', value: (r) => r.amcStatus ?? '—' },
  ];

  const totalsRow = totals
    ? ['Total', '', '', '', '', '', '', '', '', '', '', fmtMoney(totals.grandTotal), '']
    : undefined;

  return (
    <ReportShell
      title="Tools & Plants"
      description="Low-value tools & plants asset register (net value below the 1,000,000 threshold)."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} placeholder="Code…" />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter label="Category" value={category} onChange={setCategory} placeholder="Category…" />
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Name or code…" />
        </>
      }
      exportConfig={{
        filename: 'tools-and-plants',
        columns,
        rows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assets" value={rows.length} />
        <StatCard label="Total quantity" value={fmtQty(rows.reduce((s, r) => s + r.quantity, 0))} />
        <StatCard
          label="Balance quantity"
          value={fmtQty(rows.reduce((s, r) => s + r.balanceQuantity, 0))}
        />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No tools & plants assets found."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
