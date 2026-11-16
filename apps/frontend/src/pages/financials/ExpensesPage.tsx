import { useMemo } from 'react';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import { expenseHooks, type Expense } from '@/features/expenses/api';
import {
  expenseFields,
  expenseEmptyValues,
  expenseToFormValues,
} from '@/features/expenses/form';
import { expenseCategoryHooks } from '@/features/expense-categories/api';

/** Operating expenses screen (tied to expense categories). */
export function ExpensesPage() {
  const { data: cats } = expenseCategoryHooks.useList({ page: 1, limit: 200 });
  const categories = useMemo(() => cats?.data ?? [], [cats]);
  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? '—') : '—');
  }, [categories]);

  const columns: Column<Expense>[] = [
    { key: 'reference', header: 'Reference' },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'categoryId', header: 'Category', render: (r) => catName(r.categoryId) },
    { key: 'amount', header: 'Amount', render: (r) => r.amount.toFixed(2) },
  ];

  return (
    <MasterCrudPage<Expense>
      title="Expenses"
      subtitle="Operating expenses."
      newLabel="New expense"
      hooks={expenseHooks}
      columns={columns}
      fields={expenseFields}
      formBasePath="/expenses"
      emptyValues={expenseEmptyValues}
      toFormValues={expenseToFormValues}
      rowLabel={(r) => r.reference}
    />
  );
}
