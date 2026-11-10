import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { variantHooks, type Variant } from '@/features/variants/api';

const columns: Column<Variant>[] = [
  { key: 'name', header: 'Name' },
  { key: 'values', header: 'Values', render: (r) => r.values.join(', ') },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'values', label: 'Values', type: 'tags', required: true },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Variant/option templates master-data screen. */
export function VariantsPage() {
  return (
    <MasterCrudPage<Variant>
      title="Variants"
      subtitle="Variant/option templates (e.g. Size → S, M, L)."
      newLabel="New variant"
      hooks={variantHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ name: '', values: '', isActive: true }}
      toFormValues={(r) => ({
        name: r.name,
        values: r.values.join(', '),
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
