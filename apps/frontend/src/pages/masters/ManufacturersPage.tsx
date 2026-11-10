import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import {
  manufacturerHooks,
  type Manufacturer,
} from '@/features/manufacturers/api';

const columns: Column<Manufacturer>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
  { key: 'companyName', header: 'Company', render: (r) => r.companyName ?? '—' },
  { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
  { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'companyName', label: 'Company', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'website', label: 'Website', type: 'text' },
  { name: 'imageUrl', label: 'Logo URL', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'note', label: 'Note', type: 'textarea' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Manufacturers master-data screen (maker companies). */
export function ManufacturersPage() {
  return (
    <MasterCrudPage<Manufacturer>
      title="Manufacturers"
      subtitle="Maker companies for your products."
      newLabel="New manufacturer"
      hooks={manufacturerHooks}
      columns={columns}
      fields={fields}
      emptyValues={{
        name: '',
        code: '',
        companyName: '',
        phone: '',
        email: '',
        website: '',
        imageUrl: '',
        address: '',
        note: '',
        isActive: true,
      }}
      toFormValues={(r) => ({
        name: r.name,
        code: r.code ?? '',
        companyName: r.companyName ?? '',
        phone: r.phone ?? '',
        email: r.email ?? '',
        website: r.website ?? '',
        imageUrl: r.imageUrl ?? '',
        address: r.address ?? '',
        note: r.note ?? '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
      importConfig={{
        endpoint: '/manufacturers/import',
        invalidateKey: 'manufacturers',
        templateHeader:
          'name,code,companyName,phone,email,website,address',
        buildRows: (records) =>
          records.map((r) => ({
            name: r.name,
            code: r.code || undefined,
            companyName: r.companyName || undefined,
            phone: r.phone || undefined,
            email: r.email || undefined,
            website: r.website || undefined,
            address: r.address || undefined,
          })),
      }}
    />
  );
}
