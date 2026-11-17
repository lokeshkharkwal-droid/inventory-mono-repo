import { useEffect, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  CustomerFilter,
  WarehouseFilter,
  TextFilter,
  UserFilter,
  BillerFilter,
} from '@/features/reports/filters';

interface ProductExposure {
  productName: string;
  exposure: number;
}
interface ExposureRow {
  saleId: string;
  date: string;
  reference: string;
  biller: string | null;
  customer: string;
  labTest: string | null;
  productExposures: ProductExposure[];
  totalExposure: number;
}
interface ExposuresResp {
  rows: ExposureRow[];
  totals: { totalExposure: number };
  total: number;
  page: number;
  limit: number;
  dataGap: string;
}

/**
 * Exposure Report — one row per sale that has imaging/radiology exposures, with
 * its per-product exposure breakdown and summed exposure, plus a footer
 * grand-total. Exposure counts come from the per sale-line `invExposure` value
 * captured at sale entry. NOTE: the legacy "Lab Test" column came from a clinical
 * order link that the inventory schema does not carry — it stays "—".
 */
export function ExposuresPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [billerId, setBillerId] = useState('');
  const [serial, setSerial] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [from, to, reference, customerId, warehouseId, createdBy, billerId, serial]);

  const filters = {
    from,
    to,
    reference,
    customerId,
    warehouseId,
    createdBy,
    billerId,
    serial,
  };
  const { data, isLoading } = useReport<ExposuresResp>(
    'exposures',
    '/reports/exposures',
    { ...filters, page, limit: pageSize === -1 ? 100000 : pageSize },
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<ExposuresResp>(
    'exposures-export',
    '/reports/exposures',
    { ...filters, limit: 100000 },
  );
  const exportRows = exportQuery.data?.rows ?? rows;

  const exposureLabel = (r: ExposureRow): string =>
    r.productExposures.length
      ? r.productExposures
          .map((p) => `${p.productName} (${fmtQty(p.exposure)})`)
          .join('\n')
      : '—';

  const columns: ReportColumn<ExposureRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'reference', header: 'Reference No', value: (r) => r.reference },
    { key: 'biller', header: 'Biller', value: (r) => r.biller ?? '—' },
    { key: 'customer', header: 'Customer', value: (r) => r.customer },
    { key: 'labTest', header: 'Lab Test', value: (r) => r.labTest ?? '—' },
    {
      key: 'productExposure',
      header: 'Product Exposure',
      value: (r) => exposureLabel(r),
      render: (r) => (
        <span className="whitespace-pre-line text-xs">{exposureLabel(r)}</span>
      ),
    },
    {
      key: 'exposure',
      header: 'Exposure',
      align: 'right',
      value: (r) => fmtQty(r.totalExposure),
    },
  ];

  const totalsRow = totals
    ? ['Total', '', '', '', '', '', fmtQty(totals.totalExposure)]
    : undefined;

  return (
    <ReportShell
      title="Exposure Report"
      description="Per-sale imaging/radiology exposure breakdown with a summed exposure per sale."
      imageExport
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter
            label="Reference"
            value={reference}
            onChange={setReference}
          />
          <UserFilter label="Created By" value={createdBy} onChange={setCreatedBy} />
          <BillerFilter value={billerId} onChange={setBillerId} />
          <TextFilter label="Serial Number" value={serial} onChange={setSerial} placeholder="Serial…" />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: 'exposure-report',
        columns,
        rows: exportRows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={data?.total ?? rows.length} />
        <StatCard label="Total exposure" value={fmtQty(totals?.totalExposure)} />
        <StatCard
          label="Date range"
          value={from || to ? `${from || '…'} → ${to || '…'}` : 'All dates'}
        />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.saleId}
        isLoading={isLoading}
        emptyMessage="No exposed sales in range."
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
