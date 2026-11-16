import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import type { Manufacturer } from './api';

/**
 * Manufacturer create/edit form config — full EZ Health Track "Add Manufacturer"
 * field set. Shared by the list page and the dedicated `/manufacturers/add` ·
 * `/manufacturers/edit/:id` pages. Company, Name, Email, Phone and Address are
 * required (legacy parity).
 */
export const manufacturerFields: FieldConfig[] = [
  { name: 'companyName', label: 'Company', type: 'text', required: true },
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'vatNo', label: 'VAT no.', type: 'text' },
  { name: 'contactPerson', label: 'Contact person', type: 'text' },
  { name: 'email', label: 'Email Address', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'website', label: 'Website', type: 'text' },
  { name: 'imageUrl', label: 'Logo URL', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea', required: true },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'postalCode', label: 'Postal code', type: 'text' },
  { name: 'country', label: 'Country', type: 'text' },
  { name: 'invoiceFooter', label: 'Invoice footer', type: 'textarea' },
  { name: 'note', label: 'Note', type: 'textarea' },
  { name: 'cf1', label: 'Custom field 1', type: 'text' },
  { name: 'cf2', label: 'Custom field 2', type: 'text' },
  { name: 'cf3', label: 'Custom field 3', type: 'text' },
  { name: 'cf4', label: 'Custom field 4', type: 'text' },
  { name: 'cf5', label: 'Custom field 5', type: 'text' },
  { name: 'cf6', label: 'Custom field 6', type: 'text' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

export const manufacturerEmptyValues: Record<string, string | boolean> = {
  companyName: '',
  name: '',
  code: '',
  vatNo: '',
  contactPerson: '',
  email: '',
  phone: '',
  website: '',
  imageUrl: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  invoiceFooter: '',
  note: '',
  cf1: '',
  cf2: '',
  cf3: '',
  cf4: '',
  cf5: '',
  cf6: '',
  isActive: true,
};

export const manufacturerToFormValues = (
  r: Manufacturer,
): Record<string, string | boolean> => ({
  companyName: r.companyName ?? '',
  name: r.name,
  code: r.code ?? '',
  vatNo: r.vatNo ?? '',
  contactPerson: r.contactPerson ?? '',
  email: r.email ?? '',
  phone: r.phone ?? '',
  website: r.website ?? '',
  imageUrl: r.imageUrl ?? '',
  address: r.address ?? '',
  city: r.city ?? '',
  state: r.state ?? '',
  postalCode: r.postalCode ?? '',
  country: r.country ?? '',
  invoiceFooter: r.invoiceFooter ?? '',
  note: r.note ?? '',
  cf1: r.cf1 ?? '',
  cf2: r.cf2 ?? '',
  cf3: r.cf3 ?? '',
  cf4: r.cf4 ?? '',
  cf5: r.cf5 ?? '',
  cf6: r.cf6 ?? '',
  isActive: r.isActive,
});
