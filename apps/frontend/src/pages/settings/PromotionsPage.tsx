import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { promotionHooks, type Promotion } from '@/features/promotions/api';

const columns: Column<Promotion>[] = [
  { key: 'title', header: 'Title' },
  {
    key: 'description',
    header: 'Description',
    render: (r) => r.description ?? '—',
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (r) => (r.isActive ? 'Active' : 'Inactive'),
  },
];

const fields: FieldConfig[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'imageUrl', label: 'Image URL', type: 'text' },
  { name: 'startsAt', label: 'Starts', type: 'date' },
  { name: 'endsAt', label: 'Ends', type: 'date' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

/** Promotions / banners (legacy Welcome promotions). */
export function PromotionsPage() {
  return (
    <MasterCrudPage<Promotion>
      title="Promotions"
      subtitle="Marketing banners and promotional campaigns."
      newLabel="New promotion"
      hooks={promotionHooks}
      columns={columns}
      fields={fields}
      emptyValues={{
        title: '',
        description: '',
        imageUrl: '',
        startsAt: '',
        endsAt: '',
        isActive: true,
      }}
      toFormValues={(r) => ({
        title: r.title,
        description: r.description ?? '',
        imageUrl: r.imageUrl ?? '',
        startsAt: r.startsAt ? r.startsAt.slice(0, 10) : '',
        endsAt: r.endsAt ? r.endsAt.slice(0, 10) : '',
        isActive: r.isActive,
      })}
      rowLabel={(r) => r.title}
    />
  );
}
