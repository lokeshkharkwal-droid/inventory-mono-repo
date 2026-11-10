import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { brandHooks, type Brand } from '@/features/brands/api';

const columns: Column<Brand>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'imageUrl', label: 'Logo URL', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Brands / manufacturers master-data screen. */
export function BrandsPage() {
  return (
    <MasterCrudPage<Brand>
      title="Brands"
      subtitle="Brands & manufacturers."
      newLabel="New brand"
      hooks={brandHooks}
      columns={columns}
      fields={fields}
      emptyValues={{
        name: '',
        code: '',
        description: '',
        imageUrl: '',
        isActive: true,
      }}
      toFormValues={(r) => ({
        name: r.name,
        code: r.code ?? '',
        description: r.description ?? '',
        imageUrl: r.imageUrl ?? '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
