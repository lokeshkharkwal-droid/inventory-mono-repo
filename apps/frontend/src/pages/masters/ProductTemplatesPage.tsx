import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { MasterCrudPage } from '@/components/shared/MasterCrudPage';
import type { Column } from '@/components/shared/DataTable';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import { useCategories } from '@/features/categories/api';
import {
  productTemplateHooks,
  useCreateProductFromTemplate,
  type ProductTemplate,
} from '@/features/product-templates/api';

const columns: Column<ProductTemplate>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
  { key: 'category', header: 'Category', render: (r) => r.category ?? '—' },
  { key: 'price', header: 'Price', render: (r) => r.price.toFixed(2) },
  { key: 'cost', header: 'Cost', render: (r) => r.cost.toFixed(2) },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text' },
  { name: 'category', label: 'Category', type: 'text' },
  { name: 'unit', label: 'Unit', type: 'text' },
  { name: 'price', label: 'Price', type: 'number' },
  { name: 'cost', label: 'Cost', type: 'number' },
  { name: 'hsnCode', label: 'HSN code', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'isActive', label: 'Active', type: 'bool' },
];

const selectCls =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs';

/** Dialog that instantiates a real product from a template. */
function CreateProductDialog({
  template,
  onOpenChange,
}: {
  template: ProductTemplate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!template;
  const { data: categories } = useCategories({ page: 1, limit: 100 });
  const create = useCreateProductFromTemplate();
  const [categoryId, setCategoryId] = useState('');
  const [code, setCode] = useState('');

  const submit = async () => {
    if (!template) return;
    if (!categoryId) {
      toast.error('Select a category.');
      return;
    }
    try {
      await create.mutateAsync({ id: template.id, categoryId, code });
      toast.success('Product created from template.');
      onOpenChange(false);
      setCategoryId('');
      setCode('');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create product from "{template?.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select
              className={selectCls}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select a category…</option>
              {categories?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Code (optional)</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={template?.code ?? 'Auto / inherit template code'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            Create product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Product templates (legacy SITE master_products) — blueprints for new products. */
export function ProductTemplatesPage() {
  const [createFrom, setCreateFrom] = useState<ProductTemplate | null>(null);
  return (
    <>
      <MasterCrudPage<ProductTemplate>
        title="Product templates"
        subtitle="Reusable blueprints — create real products from these."
        newLabel="New template"
        hooks={productTemplateHooks}
        columns={columns}
        fields={fields}
        rowActions={(r) => (
          <Button
            variant="ghost"
            size="icon"
            title="Create product from template"
            onClick={() => setCreateFrom(r)}
          >
            <PackagePlus className="h-4 w-4" />
          </Button>
        )}
        emptyValues={{
          name: '',
          code: '',
          category: '',
          unit: '',
          price: '0',
          cost: '0',
          hsnCode: '',
          description: '',
          isActive: true,
        }}
        toFormValues={(r) => ({
          name: r.name,
          code: r.code ?? '',
          category: r.category ?? '',
          unit: r.unit ?? '',
          price: String(r.price),
          cost: String(r.cost),
          hsnCode: r.hsnCode ?? '',
          description: r.description ?? '',
          isActive: r.isActive,
        })}
        rowLabel={(r) => r.name}
      />
      <CreateProductDialog
        template={createFrom}
        onOpenChange={(o) => !o && setCreateFrom(null)}
      />
    </>
  );
}
