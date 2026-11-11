import { useMemo, useState } from 'react';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { Label } from '@/components/ui/label';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { useCategories } from '@/features/categories/api';
import {
  subCategoryHooks,
  type SubCategory,
} from '@/features/sub-categories/api';

/** Sub-categories master-data screen (parent category via a live dropdown). */
export function SubCategoriesPage() {
  // Fetch categories to populate the parent dropdown + resolve names in the list.
  const { data: catData } = useCategories({ page: 1, limit: 100 });
  const categories = useMemo(() => catData?.data ?? [], [catData]);

  // Category filter (drives the list query); empty = all categories.
  const [filterCategoryId, setFilterCategoryId] = useState('');

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? id;
  }, [categories]);

  const columns: Column<SubCategory>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'categoryId',
      header: 'Category',
      render: (r) => categoryName(r.categoryId),
    },
    { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => (r.isActive ? 'Active' : 'Inactive'),
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      required: true,
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'code', label: 'Code', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
    { name: 'isActive', label: 'Active', type: 'bool' },
  ];

  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-1.5">
        <Label>Filter by category</Label>
        <InfiniteSelect
          value={filterCategoryId}
          onChange={setFilterCategoryId}
          queryKey={['categories']}
          path="/categories"
          getOptionValue={(c: { id: string }) => c.id}
          getOptionLabel={(c: { name: string }) => c.name}
          placeholder="All categories"
          clearable
        />
      </div>
      <MasterCrudPage<SubCategory>
        title="Sub-categories"
        subtitle="Nested under a category."
        newLabel="New sub-category"
        hooks={subCategoryHooks}
        columns={columns}
        fields={fields}
        listExtra={{ categoryId: filterCategoryId || undefined }}
        emptyValues={{
          categoryId: '',
          name: '',
          code: '',
          description: '',
          sortOrder: '0',
          isActive: true,
        }}
        toFormValues={(r) => ({
          categoryId: r.categoryId,
          name: r.name,
          code: r.code ?? '',
          description: r.description ?? '',
          sortOrder: String(r.sortOrder),
          isActive: r.isActive,
        })}
        rowLabel={(r) => r.name}
      />
    </div>
  );
}
