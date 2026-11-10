import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { supplierHooks, type Supplier } from '@/features/suppliers/api';
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

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'companyName', label: 'Company', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'taxNumber', label: 'Tax number', type: 'text' },
  { name: 'openingBalance', label: 'Opening balance', type: 'number' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Suppliers master-data screen. */
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
      fields={fields}
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
      emptyValues={{
        name: '',
        code: '',
        companyName: '',
        phone: '',
        email: '',
        address: '',
        taxNumber: '',
        openingBalance: '0',
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
        openingBalance: String(r.openingBalance),
        isActive: r.isActive,
      })}
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
