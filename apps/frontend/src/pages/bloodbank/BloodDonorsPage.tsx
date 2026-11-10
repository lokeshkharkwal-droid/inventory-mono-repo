import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { donorHooks, BLOOD_GROUPS, type BloodDonor } from '@/features/bloodbank/api';

const columns: Column<BloodDonor>[] = [
  { key: 'name', header: 'Name' },
  { key: 'bloodGroup', header: 'Group' },
  { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
  { key: 'status', header: 'Status' },
  {
    key: 'lastDonationDate',
    header: 'Last donation',
    render: (r) =>
      r.lastDonationDate ? new Date(r.lastDonationDate).toLocaleDateString() : '—',
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  {
    name: 'bloodGroup',
    label: 'Blood group',
    type: 'select',
    required: true,
    options: BLOOD_GROUPS.map((g) => ({ value: g, label: g })),
  },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: ['ACTIVE', 'DEFERRED', 'REJECTED'].map((s) => ({ value: s, label: s })),
  },
];

/** Blood donors master-data screen. */
export function BloodDonorsPage() {
  return (
    <MasterCrudPage<BloodDonor>
      title="Blood donors"
      subtitle="Donor registry."
      newLabel="New donor"
      hooks={donorHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ name: '', bloodGroup: '', phone: '', email: '', status: 'ACTIVE' }}
      toFormValues={(r) => ({
        name: r.name,
        bloodGroup: r.bloodGroup,
        phone: r.phone ?? '',
        email: r.email ?? '',
        status: r.status,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
