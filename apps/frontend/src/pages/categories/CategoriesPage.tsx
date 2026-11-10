import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage } from '@/lib/http';
import {
  useCategories,
  useDeleteCategory,
} from '@/features/categories/api';
import { CategoryFormDialog } from '@/features/categories/CategoryFormDialog';
import type { Category } from '@/features/categories/types';

const LIMIT = 20;

/** Inventory categories list (Phase-0 vertical slice: full CRUD). */
export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading } = useCategories({ page, limit: LIMIT, search });
  const del = useDeleteCategory();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setDialogOpen(true);
  };

  const onDelete = async (category: Category) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    try {
      await del.mutateAsync(category.id);
      toast.success('Category deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete category'));
    }
  };

  const columns: Column<Category>[] = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => (r.isActive ? 'Active' : 'Inactive'),
    },
    { key: 'sortOrder', header: 'Order' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(r)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Product category master data.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      <Input
        placeholder="Search by name or code…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No categories yet. Create your first one."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
      />
    </div>
  );
}
