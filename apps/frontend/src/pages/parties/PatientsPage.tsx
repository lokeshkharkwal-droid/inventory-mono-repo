import { useState } from 'react';
import { HeartPulse, Wallet } from 'lucide-react';
import {
  PeopleListPage,
  RowIconButton,
  type PeopleColumn,
} from '@/components/shared/PeopleListPage';
import {
  orDash,
  shortDate,
  statusColumn,
} from '@/features/_shared/people-columns';
import { customerHooks, type Customer } from '@/features/customers/api';
import { CustomerDepositsDialog } from '@/features/customers/CustomerDepositsDialog';

/** Fixed list filter: patients only (linked or registered via Add Patient). */
const PATIENTS_ONLY = { patient: 'true' };

const columns: PeopleColumn<Customer>[] = [
  {
    key: 'name',
    header: 'Name',
    value: (r) => r.name,
    render: (r) => <span className="font-medium text-slate-800">{r.name}</span>,
    sortKey: 'name',
    filterKey: 'name',
  },
  {
    key: 'gender',
    header: 'Gender',
    value: (r) => orDash(r.gender),
    sortKey: 'gender',
    filterKey: 'gender',
  },
  { key: 'age', header: 'Age', value: (r) => orDash(r.age) },
  {
    key: 'phone',
    header: 'Phone',
    value: (r) => orDash(r.phone),
    sortKey: 'phone',
    filterKey: 'phone',
  },
  {
    key: 'patientType',
    header: 'Patient Type',
    value: (r) => orDash(r.patientType),
    sortKey: 'patientType',
    filterKey: 'patientType',
  },
  {
    key: 'registrationDate',
    header: 'Registration Date',
    value: (r) => shortDate(r.registrationDate),
    sortKey: 'registrationDate',
  },
  statusColumn<Customer>(),
];

/**
 * List Patients — patient-registered customer records (linked to a kalnostics
 * patient, or registered through Add Patient). Patient columns (Gender, Age,
 * Patient Type, Registration Date), deposits, Edit → `/patients/edit/:id`, and
 * a CSV import that registers the rows as patients.
 */
export function PatientsPage() {
  const [depositsFor, setDepositsFor] = useState<Customer | null>(null);
  return (
    <>
      <PeopleListPage<Customer>
        title="Patients"
        entity="Patient"
        icon={HeartPulse}
        basePath="/patients"
        resource="/customers"
        queryKey="customers"
        hooks={customerHooks}
        columns={columns}
        listExtra={PATIENTS_ONLY}
        rowLabel={(r) => r.name}
        rowActions={(r) => (
          <RowIconButton
            title="Deposits / advances"
            label={`Deposits for ${r.name}`}
            onClick={() => setDepositsFor(r)}
          >
            <Wallet className="h-3.5 w-3.5" />
          </RowIconButton>
        )}
        importConfig={{
          label: 'Import Patients by CSV',
          endpoint: '/customers/import',
          templateHeader:
            'firstName,middleName,lastName,gender,age,dob,phone,email,patientType,address,postalCode',
          buildRows: (records) =>
            records.map((r) => {
              const name = [r.firstName, r.middleName, r.lastName]
                .map((p) => p?.trim())
                .filter(Boolean)
                .join(' ');
              return {
                name: name || r.name,
                firstName: r.firstName || undefined,
                middleName: r.middleName || undefined,
                lastName: r.lastName || undefined,
                gender: r.gender || undefined,
                age: r.age || undefined,
                dob: r.dob || undefined,
                phone: r.phone || undefined,
                email: r.email || undefined,
                // Marks the row as a patient so it lands in this list.
                patientType: r.patientType || 'General',
                address: r.address || undefined,
                postalCode: r.postalCode || undefined,
              };
            }),
        }}
      />
      <CustomerDepositsDialog
        customer={depositsFor}
        onOpenChange={(o) => !o && setDepositsFor(null)}
      />
    </>
  );
}
