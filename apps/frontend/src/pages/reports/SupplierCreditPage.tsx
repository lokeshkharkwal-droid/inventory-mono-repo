import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  DateRangeFilter,
  SupplierFilter,
  WarehouseFilter,
  TextFilter,
  SelectFilter,
} from '@/features/reports/filters';

interface CreditRow {
  purchaseId: string;
  date: string;
  reference: string;
  warehouseName: string | null;
  supplierName: string;
  grandTotal: number;
  paid: number;
  balance: number;
  status: string;
  paymentStatus: string;
}
interface CreditResp {
  rows: CreditRow[];
  totals: { grandTotal: number; paid: number; balance: number };
}

/** Supplier Credit Report — outstanding balances per purchase. */
export function SupplierCreditPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useReport<CreditResp>('supplier-credit', '/reports/supplier-credit', { from, to, supplierId, warehouseId, reference, status });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<CreditRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'ref', header: 'Reference No', value: (r) => r.reference },
    { key: 'warehouse', header: 'Warehouse', value: (r) => r.warehouseName ?? '—' },
    { key: 'supplier', header: 'Supplier', value: (r) => r.supplierName },
    { key: 'grand', header: 'Grand Total', align: 'right', value: (r) => fmtMoney(r.grandTotal) },
    { key: 'paid', header: 'Paid', align: 'right', value: (r) => fmtMoney(r.paid) },
    { key: 'balance', header: 'Balance', align: 'right', value: (r) => fmtMoney(r.balance) },
    { key: 'status', header: 'Status', value: (r) => r.status },
    { key: 'pstatus', header: 'Payment Status', value: (r) => r.paymentStatus },
  ];
  const totalsRow = t
    ? ['Total', '', '', '', fmtMoney(t.grandTotal), fmtMoney(t.paid), fmtMoney(t.balance), '', '']
    : undefined;

  return (
    <ReportShell
      title="Supplier Credit Report"
      description="Outstanding credit per purchase — billed, paid and balance owed."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <SupplierFilter value={supplierId} onChange={setSupplierId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
          <SelectFilter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'RECEIVED', label: 'Received' },
              { value: 'ORDERED', label: 'Ordered' },
              { value: 'PENDING', label: 'Pending' },
            ]}
          />
        </>
      }
      exportConfig={{ filename: 'supplier-credit-report', columns, rows, totalsRow: totalsRow as (string | number)[] | undefined }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Purchases" value={rows.length} />
        <StatCard label="Billed" value={fmtMoney(t?.grandTotal)} />
        <StatCard label="Paid" value={fmtMoney(t?.paid)} />
        <StatCard label="Balance owed" value={fmtMoney(t?.balance)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.purchaseId} isLoading={isLoading} emptyMessage="No supplier credit in range." totalsRow={totalsRow} />
    </ReportShell>
  );
}
