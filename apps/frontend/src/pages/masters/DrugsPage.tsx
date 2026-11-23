import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { drugHooks, type Drug } from '@/features/drugs/api';

const columns: Column<Drug>[] = [
  { key: 'name', header: 'Name' },
  { key: 'dosage', header: 'Dosage', render: (r) => r.dosage ?? '—' },
  {
    key: 'therapeuticGroup',
    header: 'Therapeutic group',
    render: (r) => r.therapeuticGroup ?? '—',
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'dosage', label: 'Dosage', type: 'text' },
  { name: 'therapeuticGroup', label: 'Therapeutic group', type: 'text' },
  { name: 'formulation', label: 'Formulation', type: 'text' },
  { name: 'indication', label: 'Indication', type: 'text' },
  { name: 'contraIndication', label: 'Contra-indication', type: 'text' },
  { name: 'sideEffect', label: 'Side effect', type: 'text' },
  { name: 'precaution', label: 'Precaution', type: 'text' },
  { name: 'storageCondition', label: 'Storage condition', type: 'text' },
  { name: 'safety', label: 'Safety', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Drug master-data screen (EZHT `pharmacy_drug`) — feeds the product Drugs modal. */
export function DrugsPage() {
  return (
    <MasterCrudPage<Drug>
      title="Drugs"
      subtitle="Drug master — the catalogue the product Drugs modal picks from."
      newLabel="New drug"
      hooks={drugHooks}
      columns={columns}
      fields={fields}
      emptyValues={{
        name: '',
        dosage: '',
        therapeuticGroup: '',
        formulation: '',
        indication: '',
        contraIndication: '',
        sideEffect: '',
        precaution: '',
        storageCondition: '',
        safety: '',
        isActive: true,
      }}
      toFormValues={(r) => ({
        name: r.name,
        dosage: r.dosage ?? '',
        therapeuticGroup: r.therapeuticGroup ?? '',
        formulation: r.formulation ?? '',
        indication: r.indication ?? '',
        contraIndication: r.contraIndication ?? '',
        sideEffect: r.sideEffect ?? '',
        precaution: r.precaution ?? '',
        storageCondition: r.storageCondition ?? '',
        safety: r.safety ?? '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
