import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { unitHooks, type Unit } from '@/features/units/api';

const columns: Column<Unit>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
  {
    key: 'conversion',
    header: 'Conversion',
    render: (r) =>
      r.operator && r.operationValue != null
        ? `${r.operator} ${r.operationValue}`
        : '—',
  },
  { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  {
    name: 'operator',
    label: 'Conversion operator',
    type: 'select',
    options: [
      { value: '*', label: '× (multiply)' },
      { value: '/', label: '÷ (divide)' },
    ],
  },
  { name: 'operationValue', label: 'Conversion value', type: 'number' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Units of measure master-data screen. */
export function UnitsPage() {
  return (
    <MasterCrudPage<Unit>
      title="Units"
      subtitle="Units of measure (with optional conversion)."
      newLabel="New unit"
      hooks={unitHooks}
      columns={columns}
      fields={fields}
      emptyValues={{
        name: '',
        code: '',
        operator: '',
        operationValue: '',
        isActive: true,
      }}
      toFormValues={(r) => ({
        name: r.name,
        code: r.code ?? '',
        operator: r.operator ?? '',
        operationValue: r.operationValue != null ? String(r.operationValue) : '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
