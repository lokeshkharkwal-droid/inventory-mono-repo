import { useState } from 'react';
import { Truck, Wallet } from 'lucide-react';
import {
  PeopleListPage,
  RowIconButton,
  type PeopleColumn,
} from '@/components/shared/PeopleListPage';
import { orDash, statusColumn } from '@/features/_shared/people-columns';
import { supplierHooks, type Supplier } from '@/features/suppliers/api';
import { SupplierPaymentsDialog } from '@/features/suppliers/SupplierPaymentsDialog';

/**
 * The reference list's composite Address cell:
 * "address, city, state, country - postal code".
 */
function fullAddress(s: Supplier): string {
  const parts = [s.address, s.city, s.state, s.country]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ');
  const postal = s.postalCode?.trim();
  return [parts, postal].filter(Boolean).join(' - ');
}

/** Reference (EZ Health Track) Suppliers table columns, in order. */
const columns: PeopleColumn<Supplier>[] = [
  {
    key: 'company',
    header: 'Company',
    value: (r) => orDash(r.companyName),
    render: (r) => (
      <span className="font-medium text-slate-800">{orDash(r.companyName)}</span>
    ),
    sortKey: 'companyName',
    filterKey: 'company',
  },
  { key: 'name', header: 'Name', value: (r) => r.name, sortKey: 'name', filterKey: 'name' },
  {
    key: 'email',
    header: 'Email Address',
    value: (r) => orDash(r.email),
    sortKey: 'email',
    filterKey: 'email',
  },
  {
    key: 'phone',
    header: 'Phone',
    value: (r) => orDash(r.phone),
    sortKey: 'phone',
    filterKey: 'phone',
  },
  {
    key: 'address',
    header: 'Address',
    value: (r) => orDash(fullAddress(r)),
    render: (r) => (
      <span className="block max-w-[260px] whitespace-normal">
        {orDash(fullAddress(r))}
      </span>
    ),
    sortKey: 'address',
    filterKey: 'address',
  },
  {
    key: 'gstNo',
    header: 'GSTIN',
    value: (r) => orDash(r.gstNo),
    sortKey: 'gstNo',
    filterKey: 'gstNo',
  },
  statusColumn<Supplier>(),
];

/**
 * List Suppliers — EZ Health Track `suppliers` parity: Company, Name, Email
 * Address, Phone, Address, GSTIN, Status + Payments / Edit / Delete, the Actions
 * menu (Add Supplier, Add Suppliers by CSV, Export to Excel / PDF), search,
 * column filters and sorting. Add / Edit open `/suppliers/add|edit/:id`.
 */
export function SuppliersPage() {
  const [paymentsFor, setPaymentsFor] = useState<Supplier | null>(null);
  return (
    <>
      <PeopleListPage<Supplier>
        title="Suppliers"
        entity="Supplier"
        icon={Truck}
        basePath="/suppliers"
        resource="/suppliers"
        queryKey="suppliers"
        hooks={supplierHooks}
        columns={columns}
        rowLabel={(r) => r.companyName || r.name}
        rowActions={(r) => (
          <RowIconButton
            title="Payments"
            label={`Payments for ${r.companyName || r.name}`}
            onClick={() => setPaymentsFor(r)}
          >
            <Wallet className="h-3.5 w-3.5" />
          </RowIconButton>
        )}
        importConfig={{
          label: 'Add Suppliers by CSV',
          endpoint: '/suppliers/import',
          templateHeader:
            'companyName,name,email,phone,address,city,state,country,postalCode,drugLicense,vatNo,gstNo,panNo,gstState,openingBalance,status',
          buildRows: (records) =>
            records.map((r) => ({
              name: r.name,
              companyName: r.companyName || undefined,
              email: r.email || undefined,
              phone: r.phone || undefined,
              address: r.address || undefined,
              city: r.city || undefined,
              state: r.state || undefined,
              country: r.country || undefined,
              postalCode: r.postalCode || undefined,
              drugLicense: r.drugLicense || undefined,
              vatNo: r.vatNo || undefined,
              gstNo: r.gstNo || undefined,
              panNo: r.panNo || undefined,
              gstState: r.gstState || undefined,
              openingBalance: r.openingBalance
                ? Number(r.openingBalance)
                : undefined,
              isActive: r.status
                ? !/^(0|inactive|false|no)$/i.test(r.status)
                : undefined,
            })),
        }}
      />
      <SupplierPaymentsDialog
        supplier={paymentsFor}
        onOpenChange={(o) => !o && setPaymentsFor(null)}
      />
    </>
  );
}
