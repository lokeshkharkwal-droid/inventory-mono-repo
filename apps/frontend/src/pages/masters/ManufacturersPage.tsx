import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import {
  manufacturerHooks,
  type Manufacturer,
} from '@/features/manufacturers/api';
import {
  manufacturerFields,
  manufacturerEmptyValues,
  manufacturerToFormValues,
} from '@/features/manufacturers/form';

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

/** Manufacturers list screen — Add/Edit open the dedicated form page. */
export function ManufacturersPage() {
  return (
    <MasterCrudPage<Manufacturer>
      title="Manufacturers"
      subtitle="Maker companies for your products."
      newLabel="New manufacturer"
      hooks={manufacturerHooks}
      columns={columns}
      fields={manufacturerFields}
      formBasePath="/manufacturers"
      emptyValues={manufacturerEmptyValues}
      toFormValues={manufacturerToFormValues}
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
