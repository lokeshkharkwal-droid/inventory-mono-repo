import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import {
  expenseCategoryHooks,
  type ExpenseCategory,
} from '@/features/expense-categories/api';

const columns: Column<ExpenseCategory>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
  { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Expense categories master-data screen. */
export function ExpenseCategoriesPage() {
  return (
    <MasterCrudPage<ExpenseCategory>
      title="Expense categories"
      subtitle="Classify operating expenses."
      newLabel="New category"
      hooks={expenseCategoryHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ name: '', code: '', isActive: true }}
      toFormValues={(r) => ({ name: r.name, code: r.code ?? '', isActive: r.isActive })}
      rowLabel={(r) => r.name}
    />
  );
}
