import { Factory } from 'lucide-react';
import {
  PeopleListPage,
  type PeopleColumn,
} from '@/components/shared/PeopleListPage';
import { orDash, statusColumn } from '@/features/_shared/people-columns';
import {
  manufacturerHooks,
  type Manufacturer,
} from '@/features/manufacturers/api';

/** Reference (EZ Health Track) Manufacturers table columns, in order. */
const columns: PeopleColumn<Manufacturer>[] = [
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
    key: 'vatNo',
    header: 'VAT Number',
    value: (r) => orDash(r.vatNo),
    sortKey: 'vatNo',
    filterKey: 'vatNo',
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
    header: 'Email Address',
    value: (r) => orDash(r.email),
    sortKey: 'email',
    filterKey: 'email',
  },
  {
    key: 'city',
    header: 'City',
    value: (r) => orDash(r.city),
    sortKey: 'city',
    filterKey: 'city',
  },
  {
    key: 'country',
    header: 'Country',
    value: (r) => orDash(r.country),
    sortKey: 'country',
    filterKey: 'country',
  },
  statusColumn<Manufacturer>(),
];

/**
 * List Manufacturers — EZ Health Track `manufacturers` parity: Company, Name,
 * VAT Number, Phone, Email Address, City, Country, Status + Edit / Delete, the
 * Actions menu (Add Manufacturer, CSV import, Export to Excel / PDF), search,
 * column filters and sorting. Add / Edit open `/manufacturers/add|edit/:id`.
 */
export function ManufacturersPage() {
  return (
    <PeopleListPage<Manufacturer>
      title="Manufacturers"
      entity="Manufacturer"
      icon={Factory}
      basePath="/manufacturers"
      resource="/manufacturers"
      queryKey="manufacturers"
      hooks={manufacturerHooks}
      columns={columns}
      rowLabel={(r) => r.companyName || r.name}
      importConfig={{
        label: 'Import Manufacturers by CSV',
        endpoint: '/manufacturers/import',
        templateHeader:
          'companyName,name,vatNo,email,phone,address,city,state,country,postalCode,status',
        buildRows: (records) =>
          records.map((r) => ({
            name: r.name,
            companyName: r.companyName || undefined,
            vatNo: r.vatNo || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            address: r.address || undefined,
            city: r.city || undefined,
            state: r.state || undefined,
            country: r.country || undefined,
            postalCode: r.postalCode || undefined,
            isActive: r.status ? !/^(0|inactive|false|no)$/i.test(r.status) : undefined,
          })),
      }}
    />
  );
}
