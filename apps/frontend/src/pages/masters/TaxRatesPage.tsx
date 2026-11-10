import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { taxRateHooks, type TaxRate } from '@/features/tax-rates/api';

const columns: Column<TaxRate>[] = [
  { key: 'name', header: 'Name' },
  {
    key: 'rate',
    header: 'Rate',
    render: (r) => (r.type === 'percentage' ? `${r.rate}%` : `${r.rate}`),
  },
  { key: 'hsnCode', header: 'HSN/SAC', render: (r) => r.hsnCode ?? '—' },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'rate', label: 'Rate', type: 'number', required: true },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'percentage', label: 'Percentage' },
      { value: 'fixed', label: 'Fixed' },
    ],
  },
  { name: 'hsnCode', label: 'HSN/SAC code', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Tax rates master-data screen. */
export function TaxRatesPage() {
  return (
    <MasterCrudPage<TaxRate>
      title="Tax rates"
      subtitle="GST / tax rates with HSN/SAC codes."
      newLabel="New tax rate"
      hooks={taxRateHooks}
      columns={columns}
      fields={fields}
      emptyValues={{
        name: '',
        code: '',
        rate: '',
        type: 'percentage',
        hsnCode: '',
        isActive: true,
      }}
      toFormValues={(r) => ({
        name: r.name,
        code: r.code ?? '',
        rate: String(r.rate),
        type: r.type,
        hsnCode: r.hsnCode ?? '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
