import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import { useCategories } from '@/features/categories/api';
import { subCategoryHooks } from '@/features/sub-categories/api';
import { unitHooks } from '@/features/units/api';
import { brandHooks } from '@/features/brands/api';
import { taxRateHooks } from '@/features/tax-rates/api';
import {
  useCreateProduct,
  useUpdateProduct,
  type ProductDetail,
} from './api';

interface FormValues {
  code: string;
  name: string;
  categoryId: string;
  subCategoryId: string;
  unitId: string;
  brandId: string;
  taxRateId: string;
  type: string;
  cost: string;
  price: string;
  alertQuantity: string;
  isActive: boolean;
  isStockTracked: boolean;
  isTaxIncluded: boolean;
  isSerialized: boolean;
  genericName: string;
  strength: string;
  potency: string;
  hsnCode: string;
  description: string;
  variants: {
    name: string;
    sku: string;
    costAdjustment: string;
    priceAdjustment: string;
  }[];
}

const EMPTY: FormValues = {
  code: '',
  name: '',
  categoryId: '',
  subCategoryId: '',
  unitId: '',
  brandId: '',
  taxRateId: '',
  type: 'STANDARD',
  cost: '0',
  price: '0',
  alertQuantity: '0',
  isActive: true,
  isStockTracked: true,
  isTaxIncluded: false,
  isSerialized: false,
  genericName: '',
  strength: '',
  potency: '',
  hsnCode: '',
  description: '',
  variants: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductDetail | null;
}

/** Create/edit dialog for a product (references + inline variants). */
export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = !!product;
  const create = useCreateProduct();
  const update = useUpdateProduct();

  const { data: cats } = useCategories({ page: 1, limit: 100 });
  const { data: subs } = subCategoryHooks.useList({ page: 1, limit: 200 });
  const { data: units } = unitHooks.useList({ page: 1, limit: 200 });
  const { data: brands } = brandHooks.useList({ page: 1, limit: 200 });
  const { data: taxes } = taxRateHooks.useList({ page: 1, limit: 200 });

  const opt = (rows?: { id: string; name: string }[]) =>
    (rows ?? []).map((r) => ({ value: r.id, label: r.name }));
  const categoryOptions = useMemo(() => opt(cats?.data), [cats]);
  const subOptions = useMemo(() => opt(subs?.data), [subs]);
  const unitOptions = useMemo(() => opt(units?.data), [units]);
  const brandOptions = useMemo(() => opt(brands?.data), [brands]);
  const taxOptions = useMemo(() => opt(taxes?.data), [taxes]);

  const { register, handleSubmit, reset, control } = useForm<FormValues>({
    defaultValues: EMPTY,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            code: product.code,
            name: product.name,
            categoryId: product.categoryId ?? product.category?.id ?? '',
            subCategoryId: product.subCategoryId ?? '',
            unitId: product.unitId ?? '',
            brandId: product.brandId ?? '',
            taxRateId: product.taxRateId ?? '',
            type: product.type,
            cost: String(product.cost),
            price: String(product.price),
            alertQuantity: String(product.alertQuantity),
            isActive: product.isActive,
            isStockTracked: product.isStockTracked,
            isTaxIncluded: product.isTaxIncluded,
            isSerialized: product.isSerialized ?? false,
            genericName: product.genericName ?? '',
            strength: product.strength ?? '',
            potency: product.potency ?? '',
            hsnCode: product.hsnCode ?? '',
            description: product.description ?? '',
            variants: product.variants.map((v) => ({
              name: v.name,
              sku: v.sku ?? '',
              costAdjustment: String(v.costAdjustment),
              priceAdjustment: String(v.priceAdjustment),
            })),
          }
        : EMPTY,
    );
  }, [open, product, reset]);

  const submit = handleSubmit(async (v) => {
    const payload: Record<string, unknown> = {
      code: v.code,
      name: v.name,
      categoryId: v.categoryId,
      subCategoryId: v.subCategoryId || undefined,
      unitId: v.unitId || undefined,
      brandId: v.brandId || undefined,
      taxRateId: v.taxRateId || undefined,
      type: v.type,
      cost: Number(v.cost || 0),
      price: Number(v.price || 0),
      alertQuantity: Number(v.alertQuantity || 0),
      isActive: v.isActive,
      isStockTracked: v.isStockTracked,
      isTaxIncluded: v.isTaxIncluded,
      isSerialized: v.isSerialized,
      genericName: v.genericName || undefined,
      strength: v.strength || undefined,
      potency: v.potency || undefined,
      hsnCode: v.hsnCode || undefined,
      description: v.description || undefined,
      variants: v.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku || undefined,
        costAdjustment: Number(variant.costAdjustment || 0),
        priceAdjustment: Number(variant.priceAdjustment || 0),
      })),
    };
    try {
      if (isEdit && product) {
        await update.mutateAsync({ id: product.id, input: payload });
        toast.success('Product updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Product created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save product'));
    }
  });

  const selectCls =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <select id="categoryId" className={selectCls} {...register('categoryId', { required: true })}>
                <option value="">—</option>
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subCategoryId">Sub-category</Label>
              <select id="subCategoryId" className={selectCls} {...register('subCategoryId')}>
                <option value="">—</option>
                {subOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unitId">Unit</Label>
              <select id="unitId" className={selectCls} {...register('unitId')}>
                <option value="">—</option>
                {unitOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brandId">Brand</Label>
              <select id="brandId" className={selectCls} {...register('brandId')}>
                <option value="">—</option>
                {brandOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRateId">Tax rate</Label>
              <select id="taxRateId" className={selectCls} {...register('taxRateId')}>
                <option value="">—</option>
                {taxOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select id="type" className={selectCls} {...register('type')}>
                <option value="STANDARD">Standard</option>
                <option value="COMBO">Combo</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" step="any" {...register('cost')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="any" {...register('price')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alertQuantity">Alert quantity</Label>
              <Input id="alertQuantity" type="number" step="any" {...register('alertQuantity')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="strength">Strength</Label>
              <Input id="strength" {...register('strength')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="genericName">Generic name</Label>
              <Input id="genericName" {...register('genericName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="potency">Potency (homoeopathy)</Label>
              <Input id="potency" placeholder="e.g. 30C" {...register('potency')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hsnCode">HSN / SAC code</Label>
              <Input id="hsnCode" {...register('hsnCode')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('description')}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isActive')} /> Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isStockTracked')} /> Track stock
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isTaxIncluded')} /> Tax included
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isSerialized')} /> Serial-tracked
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variants</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ name: '', sku: '', costAdjustment: '0', priceAdjustment: '0' })
                }
              >
                <Plus className="h-4 w-4" /> Add variant
              </Button>
            </div>
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2">
                <Input placeholder="Name" {...register(`variants.${i}.name`)} />
                <Input placeholder="SKU" {...register(`variants.${i}.sku`)} />
                <Input placeholder="Cost +/-" type="number" step="any" {...register(`variants.${i}.costAdjustment`)} />
                <Input placeholder="Price +/-" type="number" step="any" {...register(`variants.${i}.priceAdjustment`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
