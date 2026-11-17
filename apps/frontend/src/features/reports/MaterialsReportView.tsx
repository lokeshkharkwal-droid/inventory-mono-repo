import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  TextFilter,
  WarehouseFilter,
  BillerFilter,
  UserFilter,
} from '@/features/reports/filters';
import { getTokenPayload } from '@/lib/http';

/** One materials-register row (shared across Materials / Tools / Material & Plants). */
export interface MaterialReportRow {
  id: string;
  date: string | null;
  referenceNo: string | null;
  biller: string | null;
  branchId: string | null;
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
  createdBy: string | null;
  isZeroStock: boolean;
}
interface MaterialsResp {
  rows: MaterialReportRow[];
  totals: { grandTotal: number; quantity: number; balanceQuantity: number };
  total: number;
  page: number;
  limit: number;
}

interface MaterialsReportViewProps {
  title: string;
  description: string;
  /** Stable query-key for the report (e.g. 'materials'). */
  reportKey: string;
  /** API path (e.g. '/reports/materials'). */
  path: string;
  /** Export/image filename (no extension). */
  filename: string;
  /** Empty-table message. */
  emptyMessage: string;
  /** Label for the row-count KPI card (e.g. 'Materials' / 'Assets'). */
  countLabel: string;
}

/**
 * Shared materials-register report view used by the Materials, Tools & Plants and
 * Material & Plants reports — in EZ Health Track these are the SAME page with a
 * different `report_type` (all < / ≥ 1,000,000 slices), so they share identical
 * filters and the full 13-column table. Only the title/description/endpoint
 * differ, passed in by each thin page wrapper.
 *
 * Filters mirror the legacy Materials report (Reference, Created By, Biller,
 * Warehouse, Serial No, date range) plus the retained Category/Search extras.
 * Branch names live in kalnostics-new, so the Branch Name column resolves
 * `branchId` → name from the JWT branch profiles (same source as the filter).
 */
export function MaterialsReportView({
  title,
  description,
  reportKey,
  path,
  filename,
  emptyMessage,
  countLabel,
}: MaterialsReportViewProps) {
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [billerId, setBillerId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [reference, setReference] = useState('');
  const [serial, setSerial] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filters = {
    warehouseId,
    categoryId,
    billerId,
    createdBy,
    reference,
    serial,
    from,
    to,
    search,
  };

  useEffect(() => {
    setPage(1);
  }, [warehouseId, categoryId, billerId, createdBy, reference, serial, from, to, search]);

  const { data, isLoading } = useReport<MaterialsResp>(reportKey, path, {
    ...filters,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<MaterialsResp>(`${reportKey}-export`, path, {
    ...filters,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

  // Branch-id → name map from the JWT branch profiles (branch names live in
  // kalnostics-new, not inventory).
  const branchNameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of getTokenPayload()?.profiles ?? []) {
      if (p.branch_id && p.branch_name) map.set(p.branch_id, p.branch_name);
    }
    return map;
  }, []);
  const branchName = (r: MaterialReportRow) =>
    (r.branchId ? branchNameOf.get(r.branchId) : null) ?? r.branchName ?? '—';

  const columns: ReportColumn<MaterialReportRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'referenceNo', header: 'Reference No', value: (r) => r.referenceNo ?? '—' },
    { key: 'biller', header: 'Biller', value: (r) => r.biller ?? '—' },
    { key: 'branchName', header: 'Branch Name', value: branchName },
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

  // Grand Total is the 12th column (index 11) in the 13-column table.
  const totalsRow = totals
    ? ['Total', '', '', '', '', '', '', '', '', '', '', fmtMoney(totals.grandTotal), '']
    : undefined;

  return (
    <ReportShell
      title={title}
      description={description}
      imageExport
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} placeholder="Code…" />
          <UserFilter label="Created By" value={createdBy} onChange={setCreatedBy} />
          <BillerFilter value={billerId} onChange={setBillerId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter label="Serial Number" value={serial} onChange={setSerial} placeholder="Serial…" />
          <TextFilter label="Category" value={categoryId} onChange={setCategoryId} placeholder="Category…" />
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Name or code…" />
        </>
      }
      exportConfig={{
        filename,
        columns,
        rows: exportRows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={countLabel} value={data?.total ?? rows.length} />
        <StatCard label="Total quantity" value={fmtQty(totals?.quantity)} />
        <StatCard label="Balance quantity" value={fmtQty(totals?.balanceQuantity)} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        totalsRow={totalsRow}
        serverPagination={{
          page,
          pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />
    </ReportShell>
  );
}
