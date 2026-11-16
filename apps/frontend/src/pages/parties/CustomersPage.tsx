import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import { customerHooks, type Customer } from '@/features/customers/api';
import {
  customerFields,
  customerEmptyValues,
  customerToFormValues,
} from '@/features/customers/form';
import { CustomerDepositsDialog } from '@/features/customers/CustomerDepositsDialog';

const columns: Column<Customer>[] = [
  { key: 'name', header: 'Name' },
  { key: 'companyName', header: 'Company', render: (r) => r.companyName ?? '—' },
  { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
  { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
  {
    key: 'loyaltyPoints',
    header: 'Points',
    render: (r) => r.loyaltyPoints ?? 0,
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

/**
 * Customers list screen. When `patientsOnly` is set it renders the patient-linked
 * subset (legacy "Patients" view). Add/Edit open the dedicated form page.
 */
export function CustomersPage({ patientsOnly = false }: { patientsOnly?: boolean } = {}) {
  const [depositsFor, setDepositsFor] = useState<Customer | null>(null);
  return (
    <>
    <MasterCrudPage<Customer>
      title={patientsOnly ? 'Patients' : 'Customers'}
      subtitle={
        patientsOnly
          ? 'Customers linked to a clinical patient record.'
          : 'People and organisations you sell to.'
      }
      newLabel={patientsOnly ? 'New patient' : 'New customer'}
      hooks={customerHooks}
      listExtra={patientsOnly ? { patient: 'true' } : undefined}
      columns={columns}
      fields={customerFields}
      formBasePath={patientsOnly ? '/patients' : '/customers'}
      rowActions={(r) => (
        <Button
          variant="ghost"
          size="icon"
          title="Deposits / advances"
          onClick={() => setDepositsFor(r)}
        >
          <Wallet className="h-4 w-4" />
        </Button>
      )}
      emptyValues={customerEmptyValues}
      toFormValues={customerToFormValues}
      rowLabel={(r) => r.name}
      importConfig={{
        endpoint: '/customers/import',
        invalidateKey: 'customers',
        templateHeader:
          'name,code,companyName,phone,email,address,taxNumber,creditLimit',
        buildRows: (records) =>
          records.map((r) => ({
            name: r.name,
            code: r.code || undefined,
            companyName: r.companyName || undefined,
            phone: r.phone || undefined,
            email: r.email || undefined,
            address: r.address || undefined,
            taxNumber: r.taxNumber || undefined,
            creditLimit: r.creditLimit ? Number(r.creditLimit) : undefined,
          })),
      }}
    />
    <CustomerDepositsDialog
      customer={depositsFor}
      onOpenChange={(o) => !o && setDepositsFor(null)}
    />
    </>
  );
}
