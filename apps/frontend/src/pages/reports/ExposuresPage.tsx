import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  CustomerFilter,
  WarehouseFilter,
  TextFilter,
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
  dataGap: string;
}

/**
 * Exposure Report — one row per sale in range with its lab test, per-product
 * exposure breakdown and summed exposure, plus a footer grand-total. Follows the
 * canonical list-report template. NOTE: sale-line exposure and the lab-test
 * linkage are not modelled in the new inventory schema, so the Lab Test, Product
 * Exposure and Exposure columns are a documented data gap (null/empty/0) — the
 * columns are still shown so the report structure stays faithful to the legacy.
 */
export function ExposuresPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const params = { from, to, reference, customerId, warehouseId };
  const { data, isLoading } = useReport<ExposuresResp>(
    'exposures',
    '/reports/exposures',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const exposureLabel = (r: ExposureRow): string =>
    r.productExposures.length
      ? r.productExposures
          .map((p) => `${p.productName} (${fmtMoney(p.exposure)})`)
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
      value: (r) => fmtMoney(r.totalExposure),
    },
  ];

  const totalsRow = totals
    ? ['Total', '', '', '', '', '', fmtMoney(totals.totalExposure)]
    : undefined;

  return (
    <ReportShell
      title="Exposure Report"
      description="Per-sale lab-test exposure breakdown with a summed exposure per sale."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter
            label="Reference"
            value={reference}
            onChange={setReference}
          />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: 'exposure-report',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <p className="text-xs text-muted-foreground">
        Exposure is not tracked in the current inventory schema — the Lab Test,
        Product Exposure and Exposure values are shown as empty/0 until a
        sale-line exposure field and lab-test linkage are added.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={rows.length} />
        <StatCard label="Total exposure" value={fmtMoney(totals?.totalExposure)} />
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
        emptyMessage="No sales in range."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
