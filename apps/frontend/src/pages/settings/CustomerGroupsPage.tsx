import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { customerGroupHooks, type CustomerGroup } from '@/features/customer-groups/api';

const columns: Column<CustomerGroup>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
  { key: 'percentage', header: 'Percentage', render: (r) => `${r.percentage}%` },
  { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'percentage', label: 'Percentage', type: 'number' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Customer groups (price tiers) master-data screen. */
export function CustomerGroupsPage() {
  return (
    <MasterCrudPage<CustomerGroup>
      title="Customer groups"
      subtitle="Price tiers for customers."
      newLabel="New group"
      hooks={customerGroupHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ name: '', code: '', percentage: '0', isActive: true }}
      toFormValues={(r) => ({
        name: r.name,
        code: r.code ?? '',
        percentage: String(r.percentage),
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
