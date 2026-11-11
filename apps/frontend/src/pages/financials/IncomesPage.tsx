import { useMemo } from 'react';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { incomeHooks, type Income } from '@/features/incomes/api';
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

  const fields: FieldConfig[] = [
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    {
      name: 'categoryId',
      label: 'Category',
      type: 'async-select',
      async: {
        queryKey: ['income-categories'],
        path: '/income-categories',
        placeholder: 'Select category…',
        clearable: true,
      },
    },
    { name: 'reference', label: 'Reference', type: 'text' },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'note', label: 'Note', type: 'textarea' },
  ];

  return (
    <MasterCrudPage<Income>
      title="Incomes"
      subtitle="Non-sale income."
      newLabel="New income"
      hooks={incomeHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ amount: '0', categoryId: '', reference: '', date: '', note: '' }}
      toFormValues={(r) => ({
        amount: String(r.amount),
        categoryId: r.categoryId ?? '',
        reference: r.reference,
        date: r.date ? r.date.slice(0, 10) : '',
        note: r.note ?? '',
      })}
      rowLabel={(r) => r.reference}
    />
  );
}
