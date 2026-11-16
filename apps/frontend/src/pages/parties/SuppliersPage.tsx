import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import { supplierHooks, type Supplier } from '@/features/suppliers/api';
import {
  supplierFields,
  supplierEmptyValues,
  supplierToFormValues,
} from '@/features/suppliers/form';
import { SupplierPaymentsDialog } from '@/features/suppliers/SupplierPaymentsDialog';

const columns: Column<Supplier>[] = [
  { key: 'name', header: 'Name' },
  { key: 'companyName', header: 'Company', render: (r) => r.companyName ?? '—' },
  { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
  { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

/** Suppliers list screen — Add/Edit open the dedicated `/suppliers/add` page. */
export function SuppliersPage() {
  const [paymentsFor, setPaymentsFor] = useState<Supplier | null>(null);
  return (
    <>
    <MasterCrudPage<Supplier>
      title="Suppliers"
      subtitle="Vendors you purchase from."
      newLabel="New supplier"
      hooks={supplierHooks}
      columns={columns}
      fields={supplierFields}
      formBasePath="/suppliers"
      rowActions={(r) => (
        <Button
          variant="ghost"
          size="icon"
          title="Payments"
          onClick={() => setPaymentsFor(r)}
        >
          <Wallet className="h-4 w-4" />
        </Button>
      )}
      emptyValues={supplierEmptyValues}
      toFormValues={supplierToFormValues}
      rowLabel={(r) => r.name}
      importConfig={{
        endpoint: '/suppliers/import',
        invalidateKey: 'suppliers',
        templateHeader:
          'name,code,companyName,phone,email,address,taxNumber,openingBalance',
        buildRows: (records) =>
          records.map((r) => ({
            name: r.name,
            code: r.code || undefined,
            companyName: r.companyName || undefined,
            phone: r.phone || undefined,
            email: r.email || undefined,
            address: r.address || undefined,
            taxNumber: r.taxNumber || undefined,
            openingBalance: r.openingBalance
              ? Number(r.openingBalance)
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
