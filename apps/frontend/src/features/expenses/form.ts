import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import type { Expense } from './api';

/**
 * Expense create/edit form config — full EZ Health Track "Add Expense" field
 * set. Shared by the list page and the dedicated form page.
 */
export const expenseFields: FieldConfig[] = [
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'reference', label: 'Reference', type: 'text' },
  {
    name: 'categoryId',
    label: 'Category',
    type: 'async-select',
    async: {
      queryKey: ['expense-categories'],
      path: '/expense-categories',
      placeholder: 'Select category…',
      clearable: true,
    },
  },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  { name: 'hsnCode', label: 'HSN code', type: 'text' },
  {
    name: 'taxMethod',
    label: 'Tax method',
    type: 'select',
    options: [
      { value: 'exclusive', label: 'Exclusive' },
      { value: 'inclusive', label: 'Inclusive' },
    ],
  },
  { name: 'gstNo', label: 'GST no.', type: 'text' },
  { name: 'attachmentUrl', label: 'Attachment URL', type: 'text' },
  { name: 'note', label: 'Note', type: 'textarea' },
];

export const expenseEmptyValues: Record<string, string | boolean> = {
  date: '',
  reference: '',
  categoryId: '',
  amount: '0',
  hsnCode: '',
  taxMethod: '',
  gstNo: '',
  attachmentUrl: '',
  note: '',
};

export const expenseToFormValues = (
  r: Expense,
): Record<string, string | boolean> => ({
  date: r.date ? r.date.slice(0, 10) : '',
  reference: r.reference,
  categoryId: r.categoryId ?? '',
  amount: String(r.amount),
  hsnCode: r.hsnCode ?? '',
  taxMethod: r.taxMethod ?? '',
  gstNo: r.gstNo ?? '',
  attachmentUrl: r.attachmentUrl ?? '',
  note: r.note ?? '',
});
