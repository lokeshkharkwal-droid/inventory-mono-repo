import { useState } from 'react';
import { Users, Wallet } from 'lucide-react';
import {
  PeopleListPage,
  RowIconButton,
  type PeopleColumn,
} from '@/components/shared/PeopleListPage';
import { orDash, statusColumn } from '@/features/_shared/people-columns';
import { customerHooks, type Customer } from '@/features/customers/api';
import { CustomerDepositsDialog } from '@/features/customers/CustomerDepositsDialog';

/** Fixed list filter: plain customers only — patients live under /patients. */
const CUSTOMERS_ONLY = { patient: 'false' };

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
    key: 'company',
    header: 'Company',
    value: (r) => orDash(r.companyName),
    sortKey: 'companyName',
    filterKey: 'company',
  },
  {
    key: 'phone',
    header: 'Phone',
    value: (r) => orDash(r.phone),
    sortKey: 'phone',
    filterKey: 'phone',
  },
  {
    key: 'email',
    header: 'Email',
    value: (r) => orDash(r.email),
    sortKey: 'email',
    filterKey: 'email',
  },
  {
    key: 'loyaltyPoints',
    header: 'Points',
    value: (r) => r.loyaltyPoints ?? 0,
    sortKey: 'loyaltyPoints',
  },
  statusColumn<Customer>(),
];

/**
 * Customers list — people and organisations you sell to (patients excluded;
 * they have their own list). Deposits / advances, Edit → `/customers/edit/:id`,
 * CSV import and Excel / PDF export.
 */
export function CustomersPage() {
  const [depositsFor, setDepositsFor] = useState<Customer | null>(null);
  return (
    <>
      <PeopleListPage<Customer>
        title="Customers"
        entity="Customer"
        icon={Users}
        basePath="/customers"
        resource="/customers"
        queryKey="customers"
        hooks={customerHooks}
        columns={columns}
        listExtra={CUSTOMERS_ONLY}
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
          label: 'Import Customers by CSV',
          endpoint: '/customers/import',
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
