import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  SelectFilter,
  TextFilter,
  WarehouseFilter,
} from '@/features/reports/filters';

/**
 * One IPD-sales row — a single inpatient admission with the total of the
 * billable charges booked against it. Shapes and field names mirror the backend
 * `ReportsIpdService.ipdSales` return exactly; Prisma.Decimal money values are
 * serialised to numbers by the global ResponseInterceptor, and the documented
 * data-gap money columns (tax/discount/received/balance) arrive as 0/null.
 */
interface IpdSaleRow {
  admissionId: string;
  admissionNo: string;
  patientId: string | null;
  patientName: string;
  ward: string | null;
  bed: string | null;
  referringDoctor: string | null;
  branchId: string | null;
  branchName: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  status: string;
  lastChargeAt: string | null;
  chargeCount: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  received: number | null;
  balance: number | null;
}
interface IpdSalesResp {
  rows: IpdSaleRow[];
  totals: {
    admissions: number;
    chargeCount: number;
    taxAmount: number;
    discount: number;
    grandTotal: number;
  };
  range: { from: string | null; to: string | null };
  dataGap: string;
}

/** Dash renderer for the documented data-gap money columns (null = no source). */
function money(v: number | null): string {
  return v === null ? '—' : fmtMoney(v);
}

/** The ward/bed pair shown as the legacy "Department Name / Bed No" column. */
function departmentBed(r: IpdSaleRow): string {
  return [r.ward, r.bed].filter(Boolean).join(' / ') || '—';
}

/** The legacy "Current Status + Admit/Discharge Date" composite cell. */
function statusLabel(r: IpdSaleRow): string {
  const when = r.status === 'ADMITTED' ? r.admittedAt : r.dischargedAt;
  return when ? `${r.status}, ${fmtDate(when)}` : r.status;
}

/**
 * IPD Sales Report — one row per inpatient admission with the total of the
 * billable charges booked against it over the date range.
 *
 * Data gaps (no source in the inventory schema): the IPD charge ledger stores
 * only a gross amount per line, so the legacy medicine-dispensing columns
 * (Dispense No, Medicine Name, Batch No, Expiry, Unit) and the tax / discount /
 * received / balance columns render a dash rather than being hidden.
 */
export function IpdSalesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [ipdRegNo, setIpdRegNo] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const params = { from, to, status, ipdRegNo, departmentName, warehouseId };
  const { data, isLoading } = useReport<IpdSalesResp>('ipd-sales', '/reports/ipd-sales', params);
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<IpdSaleRow>[] = [
    { key: 'dispenseNo', header: 'Dispense No', value: () => '—' },
    {
      key: 'dispenseDate',
      header: 'Date/Time of Dispense',
      value: (r) => fmtDate(r.lastChargeAt ?? r.admittedAt),
    },
    { key: 'ipdRegNo', header: 'IPD Reg No', value: (r) => r.admissionNo },
    { key: 'patient', header: 'Patient Name / Age / Gender', value: (r) => r.patientName },
    { key: 'status', header: 'Current Status, Admit/Discharge Date', value: statusLabel },
    { key: 'department', header: 'Department Name / Bed No', value: departmentBed },
    { key: 'medicine', header: 'Medicine Name', value: () => '—' },
    { key: 'batchNo', header: 'Batch No', value: () => '—' },
    { key: 'expiry', header: 'Expiry Date', value: () => '—' },
    {
      key: 'quantity',
      header: 'Total Quantity',
      align: 'right',
      value: (r) => fmtQty(r.chargeCount),
    },
    { key: 'unit', header: 'Unit', value: () => '—' },
    { key: 'doctor', header: 'Referring Doctor', value: (r) => r.referringDoctor ?? '—' },
    { key: 'tax', header: 'Total Tax', align: 'right', value: (r) => money(r.taxAmount) },
    { key: 'discount', header: 'Discount', align: 'right', value: (r) => money(r.discount) },
    { key: 'grand', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
    { key: 'received', header: 'Received', align: 'right', value: (r) => money(r.received) },
    { key: 'balance', header: 'Balance', align: 'right', value: (r) => money(r.balance) },
  ];

  const totalsRow = totals
    ? [
        'Total', '', '', '', '', '', '', '', '',
        fmtQty(totals.chargeCount),
        '', '',
        money(totals.taxAmount),
        money(totals.discount),
        fmtMoney(totals.grandTotal),
        '—', '—',
      ]
    : undefined;

  return (
    <ReportShell
      title="IPD Sales Report"
      description="Each inpatient admission with the total of the billable charges booked against it."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <SelectFilter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ADMITTED', label: 'Admitted' },
              { value: 'DISCHARGED', label: 'Discharged' },
            ]}
          />
          <TextFilter label="IPD Reg No" value={ipdRegNo} onChange={setIpdRegNo} placeholder="ADM-…" />
          <TextFilter label="Department" value={departmentName} onChange={setDepartmentName} placeholder="Dept…" />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{
        filename: 'ipd-sales-report',
        columns,
        rows,
        subtitle: from || to ? `${from || '…'} → ${to || '…'}` : 'All dates',
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Admissions" value={totals?.admissions ?? rows.length} />
        <StatCard label="Charge lines" value={fmtQty(totals?.chargeCount)} />
        <StatCard label="Grand total" value={fmtMoney(totals?.grandTotal)} />
        <StatCard label="Discount" value={fmtMoney(totals?.discount)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.admissionId}
        isLoading={isLoading}
        emptyMessage="No IPD sales in range."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
