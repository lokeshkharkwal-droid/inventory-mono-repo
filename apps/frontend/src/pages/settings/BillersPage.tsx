import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { billerHooks, type Biller } from '@/features/billers/api';

const columns: Column<Biller>[] = [
  {
    key: 'logoUrl',
    header: 'Logo',
    render: (r) =>
      r.logoUrl ? (
        <img
          src={r.logoUrl}
          alt={`${r.name} logo`}
          className="h-8 w-8 rounded object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        '—'
      ),
  },
  { key: 'name', header: 'Name' },
  { key: 'companyName', header: 'Company', render: (r) => r.companyName ?? '—' },
  { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
  { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'companyName', label: 'Company', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'taxNumber', label: 'Tax number', type: 'text' },
  { name: 'logoUrl', label: 'Logo URL', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Billers master-data screen. */
export function BillersPage() {
  return (
    <MasterCrudPage<Biller>
      title="Billers"
      subtitle="Entities that issue invoices."
      newLabel="New biller"
      hooks={billerHooks}
      columns={columns}
      fields={fields}
      emptyValues={{
        name: '',
        code: '',
        companyName: '',
        phone: '',
        email: '',
        address: '',
        taxNumber: '',
        logoUrl: '',
        isActive: true,
      }}
      toFormValues={(r) => ({
        name: r.name,
        code: r.code ?? '',
        companyName: r.companyName ?? '',
        phone: r.phone ?? '',
        email: r.email ?? '',
        address: r.address ?? '',
        taxNumber: r.taxNumber ?? '',
        logoUrl: r.logoUrl ?? '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
