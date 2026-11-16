import { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { ReportShell } from '@/components/shared/ReportShell';
import { ReportTable } from '@/components/shared/ReportTable';
import { useReport } from '@/features/reports/useReport';
import { fmtQty, fmtDate, type ReportColumn } from '@/features/reports/types';
import { TextFilter } from '@/features/reports/filters';

interface Row {
  id: string;
  productName: string;
  code: string | null;
  batchNo: string | null;
  expiryDate: string | null;
  quantity: number;
}
interface Resp {
  rows: Row[];
  totals: { quantity: number };
}

/** Product Quantity (Batch) — on-hand quantity per product batch, with expiry. */
export function ProductQuantityBatchPage() {
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');

  const params = { categoryId, search };
  const { data, isLoading } = useReport<Resp>(
    'product-quantity-batch',
    '/reports/product-quantity-batch',
    params,
  );
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: ReportColumn<Row>[] = [
    { key: 'code', header: 'Code', value: (r) => r.code ?? '—' },
    { key: 'productName', header: 'Product Name', value: (r) => r.productName },
    { key: 'batchNo', header: 'Batch No', value: (r) => r.batchNo ?? '—' },
    { key: 'expiryDate', header: 'Expiry', value: (r) => fmtDate(r.expiryDate) },
    { key: 'quantity', header: 'Quantity', align: 'right', value: (r) => fmtQty(r.quantity) },
  ];

  const totalsRow = totals
    ? ['Total', '', '', '', fmtQty(totals.quantity)]
    : undefined;

  return (
    <ReportShell
      title="Product Quantity (Batch)"
      description="On-hand quantity broken down by product batch and expiry."
      filters={
        <>
          <TextFilter label="Category" value={categoryId} onChange={setCategoryId} placeholder="Category…" />
          <TextFilter label="Search" value={search} onChange={setSearch} placeholder="Name or code…" />
        </>
      }
      exportConfig={{
        filename: 'product-quantity-batch',
        columns,
        rows,
        totalsRow: totalsRow as (string | number)[] | undefined,
      }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Batches" value={rows.length} />
        <StatCard label="Total quantity" value={fmtQty(totals?.quantity)} />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No batches found."
        totalsRow={totalsRow}
      />
    </ReportShell>
  );
}
