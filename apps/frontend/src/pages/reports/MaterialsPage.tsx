import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import { DateRangeFilter, TextFilter, WarehouseFilter } from '@/features/reports/filters';

interface MaterialRow {
  id: string;
  date: string | null;
  referenceNo: string | null;
  biller: string | null;
  branchName: string | null;
  sellerName: string | null;
  productName: string;
  category: string | null;
  quantity: number;
  repairQuantity: number;
  damageQuantity: number;
  balanceQuantity: number;
  unitPrice: number;
  grandTotal: number;
  amcStatus: string | null;
  isZeroStock: boolean;
}
interface MaterialsResp {
  rows: MaterialRow[];
  totals: {
    grandTotal: number;
  };
}

/**
 * Materials Report — one row per recorded material (fixed-asset / equipment style
 * inventory item) with received quantity, outstanding repair & damage quantities,
 * derived balance quantity, unit price and current stock value
 * (grandTotal = balanceQuantity × unitPrice). The Grand Total column is
 * footer-summed. Legacy columns with no source in the new Prisma schema
 * (Biller, Branch Name, Seller Name, AMC Status) are still shown per the
 * "disable, don't hide" rule and render a dash when null.
 */
export function MaterialsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [reference, setReference] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const params = { warehouseId, categoryId, reference, from, to, search };
  const { data, isLoading } = useReport<MaterialsResp>(
    'materials',
    '/reports/materials',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<MaterialRow>[] = [
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

  const zeroStockCount = rows.filter((r) => r.isZeroStock).length;

  return (
    <ReportShell
      title="Materials Report"
      description="Every recorded material with repair/damage quantities, derived balance and current stock value."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} placeholder="Code…" />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter label="Category" value={categoryId} onChange={setCategoryId} placeholder="Category…" />
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Name or code…" />
        </>
      }
      exportConfig={{
        filename: 'materials-report',
        columns,
        rows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Materials" value={rows.length} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
        <StatCard label="Zero-stock items" value={zeroStockCount} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No materials found."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
