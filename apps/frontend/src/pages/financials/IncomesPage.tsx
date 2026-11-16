import { useMemo } from 'react';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import { incomeHooks, type Income } from '@/features/incomes/api';
import {
  incomeFields,
  incomeEmptyValues,
  incomeToFormValues,
} from '@/features/incomes/form';
import { incomeCategoryHooks } from '@/features/income-categories/api';

/** Non-sale incomes screen (tied to income categories). */
export function IncomesPage() {
  const { data: cats } = incomeCategoryHooks.useList({ page: 1, limit: 200 });
  const categories = useMemo(() => cats?.data ?? [], [cats]);
  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? '—') : '—');
  }, [categories]);

  const columns: Column<Income>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'categoryId', header: 'Category', render: (r) => catName(r.categoryId) },
    { key: 'amount', header: 'Amount', render: (r) => r.amount.toFixed(2) },
  ];

  return (
    <MasterCrudPage<Income>
      title="Incomes"
      subtitle="Non-sale income."
      newLabel="New income"
      hooks={incomeHooks}
      columns={columns}
      fields={incomeFields}
      formBasePath="/incomes"
      emptyValues={incomeEmptyValues}
      toFormValues={incomeToFormValues}
      rowLabel={(r) => r.reference}
    />
  );
}
