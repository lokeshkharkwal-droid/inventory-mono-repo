import { useEffect, useState } from 'react';
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
  UserFilter,
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
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Payments Report — merged ledger of payments received (sales) and made (purchases). */
export function PaymentsReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [saleReference, setSaleReference] = useState('');
  const [purchaseReference, setPurchaseReference] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [
    from,
    to,
    reference,
    customerId,
    supplierId,
    warehouseId,
    createdBy,
    saleReference,
    purchaseReference,
    cardNo,
    chequeNo,
  ]);

  const filters = {
    from,
    to,
    reference,
    customerId,
    supplierId,
    warehouseId,
    createdBy,
    saleReference,
    purchaseReference,
    cardNo,
    chequeNo,
  };
  const { data, isLoading } = useReport<PayResp>('payments', '/reports/payments-ledger', {
    ...filters,
    page,
    limit: pageSize === -1 ? 100000 : pageSize,
  });
  const rows = data?.rows ?? [];
  const t = data?.totals;

  // Full filtered set for CSV/PDF export (keyed by filters only, not page).
  const exportQuery = useReport<PayResp>('payments-export', '/reports/payments-ledger', {
    ...filters,
    limit: 100000,
  });
  const exportRows = exportQuery.data?.rows ?? rows;

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
      imageExport
      filters={
        <>
          <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <TextFilter label="Payment Ref" value={reference} onChange={setReference} />
          <TextFilter label="Sale Reference" value={saleReference} onChange={setSaleReference} />
          <TextFilter label="Purchase Reference" value={purchaseReference} onChange={setPurchaseReference} />
          <TextFilter label="Card Number" value={cardNo} onChange={setCardNo} placeholder="Last 4…" />
          <TextFilter label="Cheque Number" value={chequeNo} onChange={setChequeNo} />
          <UserFilter label="Created By" value={createdBy} onChange={setCreatedBy} />
          <CustomerFilter value={customerId} onChange={setCustomerId} />
          <SupplierFilter value={supplierId} onChange={setSupplierId} />
          <WarehouseFilter value={warehouseId} onChange={setWarehouseId} />
        </>
      }
      exportConfig={{ filename: 'payments-report', columns, rows: exportRows }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Received" value={fmtMoney(t?.received)} />
        <StatCard label="Made" value={fmtMoney(t?.sent)} />
        <StatCard label="Returned" value={fmtMoney(t?.returned)} />
        <StatCard label="Net" value={fmtMoney(t?.net)} />
      </div>
      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No payments in range."
        serverPagination={{
          page,
          pageSize,
          total: data?.pagination.total ?? 0,
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
