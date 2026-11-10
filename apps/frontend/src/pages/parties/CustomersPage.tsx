import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { customerHooks, type Customer } from '@/features/customers/api';
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

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'companyName', label: 'Company', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'taxNumber', label: 'Tax number', type: 'text' },
  { name: 'creditLimit', label: 'Credit limit', type: 'number' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/**
 * Customers master-data screen. When `patientsOnly` is set it renders the
 * patient-linked subset (legacy "Patients" view).
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
      newLabel="New customer"
      hooks={customerHooks}
      listExtra={patientsOnly ? { patient: 'true' } : undefined}
      columns={columns}
      fields={fields}
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
      emptyValues={{
        name: '',
        code: '',
        companyName: '',
        phone: '',
        email: '',
        address: '',
        taxNumber: '',
        creditLimit: '',
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
        creditLimit: r.creditLimit != null ? String(r.creditLimit) : '',
        isActive: r.isActive,
      })}
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
