import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import type { Income } from './api';

/**
 * Income create/edit form config — full EZ Health Track "Add Income" field set.
 * Shared by the list page and the dedicated form page.
 */
export const incomeFields: FieldConfig[] = [
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'reference', label: 'Reference', type: 'text' },
  {
    name: 'categoryId',
    label: 'Category',
    type: 'async-select',
    async: {
      queryKey: ['income-categories'],
      path: '/income-categories',
      placeholder: 'Select category…',
      clearable: true,
    },
  },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  {
    name: 'taxMethod',
    label: 'Tax method',
    type: 'select',
    options: [
      { value: 'exclusive', label: 'Exclusive' },
      { value: 'inclusive', label: 'Inclusive' },
    ],
  },
  { name: 'attachmentUrl', label: 'Attachment URL', type: 'text' },
  { name: 'note', label: 'Note', type: 'textarea' },
];

export const incomeEmptyValues: Record<string, string | boolean> = {
  date: '',
  reference: '',
  categoryId: '',
  amount: '0',
  taxMethod: '',
  attachmentUrl: '',
  note: '',
};

export const incomeToFormValues = (
  r: Income,
): Record<string, string | boolean> => ({
  date: r.date ? r.date.slice(0, 10) : '',
  reference: r.reference,
  categoryId: r.categoryId ?? '',
  amount: String(r.amount),
  taxMethod: r.taxMethod ?? '',
  attachmentUrl: r.attachmentUrl ?? '',
  note: r.note ?? '',
});
