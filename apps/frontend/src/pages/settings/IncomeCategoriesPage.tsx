import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import {
  incomeCategoryHooks,
  type IncomeCategory,
} from '@/features/income-categories/api';

const columns: Column<IncomeCategory>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
  { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Income categories master-data screen. */
export function IncomeCategoriesPage() {
  return (
    <MasterCrudPage<IncomeCategory>
      title="Income categories"
      subtitle="Classify non-sale income."
      newLabel="New category"
      hooks={incomeCategoryHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ name: '', code: '', isActive: true }}
      toFormValues={(r) => ({ name: r.name, code: r.code ?? '', isActive: r.isActive })}
      rowLabel={(r) => r.name}
    />
  );
}
