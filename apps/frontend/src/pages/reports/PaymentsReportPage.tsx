import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtMoney, fmtDate, type ReportColumn } from '@/features/reports/types';
import {
  CustomerFilter,
  DateRangeFilter,
  SupplierFilter,
  TextFilter,
  WarehouseFilter,
} from '@/features/reports/filters';

interface PayRow {
  id: string;
  source: string;
  date: string;
  paymentRef: string | null;
  saleRef: string | null;
  purchaseRef: string | null;
  paidBy: string;
  amount: number;
  type: string;
}
interface PayResp {
  rows: PayRow[];
  totals: { received: number; sent: number; returned: number; net: number };
}

/** Payments Report — merged ledger of payments received (sales) and made (purchases). */
export function PaymentsReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading } = useReport<PayResp>('payments', '/reports/payments-ledger', {
    from,
    to,
    reference,
    customerId,
    supplierId,
    warehouseId,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  const columns: ReportColumn<PayRow>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
    { key: 'paymentRef', header: 'Payment Ref', value: (r) => r.paymentRef ?? '—' },
    { key: 'saleRef', header: 'Sale Ref', value: (r) => r.saleRef ?? '—' },
    { key: 'purchaseRef', header: 'Purchase Ref', value: (r) => r.purchaseRef ?? '—' },
    { key: 'paidBy', header: 'Paid By', value: (r) => r.paidBy },
    { key: 'amount', header: 'Amount', align: 'right', value: (r) => fmtMoney(r.amount) },
    { key: 'type', header: 'Type', value: (r) => r.type },
  ];

  return (
    <ReportShell
      title="Payments Report"
      description="All payments received (sales) and made (purchases) in the range."
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Reference" value={reference} onChange={setReference} />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <SupplierFilter value={supplierId} onChange={setSupplierId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: 'payments-report', columns, rows }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Received" value={fmtMoney(t?.received)} />
        <StatCard label="Made" value={fmtMoney(t?.sent)} />
        <StatCard label="Returned" value={fmtMoney(t?.returned)} />
        <StatCard label="Net" value={fmtMoney(t?.net)} />
      </div>
      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} emptyMessage="No payments in range." />
    </ReportShell>
  );
}
