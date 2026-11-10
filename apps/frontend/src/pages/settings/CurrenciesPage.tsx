import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { currencyHooks, type Currency } from '@/features/currencies/api';

const columns: Column<Currency>[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  { key: 'symbol', header: 'Symbol', render: (r) => r.symbol ?? '—' },
  { key: 'exchangeRate', header: 'Rate' },
  { key: 'isActive', header: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
];

const fields: FieldConfig[] = [
  { name: 'code', label: 'Code', type: 'text', required: true },
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'symbol', label: 'Symbol', type: 'text' },
  { name: 'exchangeRate', label: 'Exchange rate', type: 'number' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Currencies master-data screen. */
export function CurrenciesPage() {
  return (
    <MasterCrudPage<Currency>
      title="Currencies"
      subtitle="Supported currencies and exchange rates."
      newLabel="New currency"
      hooks={currencyHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ code: '', name: '', symbol: '', exchangeRate: '1', isActive: true }}
      toFormValues={(r) => ({
        code: r.code,
        name: r.name,
        symbol: r.symbol ?? '',
        exchangeRate: String(r.exchangeRate),
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
