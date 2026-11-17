import { useEffect, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import { WarehouseFilter, TextFilter, SelectFilter } from '@/features/reports/filters';

interface ExpiryRow {
  id: string;
  productId: string;
  imageUrl: string | null;
  productCode: string;
  productName: string;
  branchId: string | null;
  warehouseName: string | null;
  serialNo: string | null;
  batchNo: string | null;
  quantity: number;
  expiryDate: string | null;
  expiringDays: number;
  isExpired: boolean;
}
interface ExpiryResp {
  rows: ExpiryRow[];
  total: number;
  expired: number;
  expiringSoon: number;
  alertDays: number;
  horizonDate: string;
  page: number;
  limit: number;
}

const ALERT_DAYS_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
];

/**
 * Product Expiry Alerts — in-stock product batches/serials expiring within the
 * chosen horizon (alertDays, default 90). A filtered list report: warehouse +
 * search + alert-days filters, KPI cards, and CSV/PDF export. Rows expiring in
 * the past are flagged "Expired"; the legacy view carried no footer totals.
 */
export function ExpiryAlertsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [alertDays, setAlertDays] = useState('90');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, search, alertDays]);

  const filters = { warehouseId, search, alertDays };
  const { data, isLoading } = useReport<ExpiryResp>(
    'expiry-alerts',
    '/reports/expiry-alerts',
    { ...filters, page, limit: pageSize === -1 ? 100000 : pageSize },
  );
  const rows = data?.rows ?? [];
  const totalCount = data?.total ?? rows.length;
  const expiredCount = data?.expired ?? 0;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<ExpiryResp>(
    'expiry-alerts-export',
    '/reports/expiry-alerts',
    { ...filters, limit: 100000 },
  );
  const exportRows = exportQuery.data?.rows ?? rows;

  const columns: ReportColumn<ExpiryRow>[] = [
    {
      key: 'image',
      header: 'Image',
      value: (r) => r.imageUrl ?? '—',
      render: (r) =>
        r.imageUrl ? (
          <img
            src={r.imageUrl}
            alt={r.productName}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'code', header: 'Product Code', value: (r) => r.productCode },
    { key: 'name', header: 'Product Name', value: (r) => r.productName },
    {
      key: 'warehouse',
      header: 'Warehouse',
      value: (r) => r.warehouseName ?? '—',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      value: (r) => fmtQty(r.quantity),
    },
    { key: 'serial', header: 'Serial No', value: (r) => r.serialNo ?? '—' },
    { key: 'batch', header: 'Batch No', value: (r) => r.batchNo ?? '—' },
    { key: 'expiry', header: 'Expiry Date', value: (r) => fmtDate(r.expiryDate) },
    {
      key: 'expiringDays',
      header: 'Expiring Days',
      align: 'right',
      value: (r) => r.expiringDays,
      render: (r) => (
        <span className={r.isExpired ? 'text-destructive font-medium' : 'text-amber-600'}>
          {r.isExpired ? `${r.expiringDays} (Expired)` : r.expiringDays}
        </span>
      ),
    },
  ];

  return (
    <ReportShell
      title="Product Expiry Alerts"
      description="In-stock batches expiring within the alert horizon; past-dated rows are already expired."
      filters={
        <>
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <TextFilter
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Code or name…"
          />
          <SelectFilter
            label="Alert Days"
            value={alertDays}
            onChange={setAlertDays}
            options={ALERT_DAYS_OPTIONS}
            allLabel="90 days"
          />
        </>
      }
      exportConfig={{
        filename: 'expiry-alerts',
        columns,
        rows: exportRows,
        subtitle: `Horizon ${data?.alertDays ?? Number(alertDays)} days → ${fmtDate(data?.horizonDate)}`,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Batches at risk" value={totalCount} />
        <StatCard label="Already expired" value={expiredCount} />
        <StatCard label="Expiring soon" value={data?.expiringSoon ?? totalCount - expiredCount} />
        <StatCard
          label="Horizon"
          value={`${data?.alertDays ?? Number(alertDays)} days`}
          hint={fmtDate(data?.horizonDate)}
        />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No batches expiring in this horizon."
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
