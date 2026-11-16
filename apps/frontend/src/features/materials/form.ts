import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import type { Material } from './api';

/**
 * Material create/edit form config — shared by the Materials list page and the
 * dedicated `/materials/add` · `/materials/edit/:id` pages.
 */
export const materialFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'category', label: 'Category', type: 'text' },
  { name: 'unit', label: 'Unit', type: 'text' },
  { name: 'quantity', label: 'Quantity', type: 'number' },
  { name: 'cost', label: 'Cost', type: 'number' },
  { name: 'note', label: 'Note', type: 'textarea' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

export const materialEmptyValues: Record<string, string | boolean> = {
  name: '',
  code: '',
  category: '',
  unit: '',
  quantity: '0',
  cost: '0',
  note: '',
  isActive: true,
};

export const materialToFormValues = (
  r: Material,
): Record<string, string | boolean> => ({
  name: r.name,
  code: r.code ?? '',
  category: r.category ?? '',
  unit: r.unit ?? '',
  quantity: String(r.quantity),
  cost: String(r.cost),
  note: r.note ?? '',
  isActive: r.isActive,
});
