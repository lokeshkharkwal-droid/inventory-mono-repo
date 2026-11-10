import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import {
  emailTemplateHooks,
  type EmailTemplate,
} from '@/features/email-templates/api';

const columns: Column<EmailTemplate>[] = [
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type', render: (r) => r.type ?? '—' },
  { key: 'subject', header: 'Subject', render: (r) => r.subject ?? '—' },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'type', label: 'Type (e.g. SALE, PURCHASE)', type: 'text' },
  { name: 'subject', label: 'Subject', type: 'text' },
  { name: 'body', label: 'Body', type: 'textarea' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Email/message templates master-data screen. */
export function EmailTemplatesPage() {
  return (
    <MasterCrudPage<EmailTemplate>
      title="Email templates"
      subtitle="Reusable message templates for documents and notifications."
      newLabel="New template"
      hooks={emailTemplateHooks}
      columns={columns}
      fields={fields}
      emptyValues={{ name: '', type: '', subject: '', body: '', isActive: true }}
      toFormValues={(r) => ({
        name: r.name,
        type: r.type ?? '',
        subject: r.subject ?? '',
        body: r.body ?? '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.name}
    />
  );
}
