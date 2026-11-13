import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
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
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage, uploadAttachment } from '@/lib/http';
import {
  useCreateProduct,
  useUpdateProduct,
  type ProductDetail,
} from './api';
import {
  UNIT_TYPE_GROUPS,
  FORMULATION_GROUPS,
  ROUTE_OPTIONS,
  FREQUENCY_OPTIONS,
  REFILL_OPTIONS,
  PRESCRIPTION_NOTE_OPTIONS,
  type Option,
  type OptionGroup,
} from './prescription-options';

/** Ordered EZHT custom-field labels (cf1..cf11). */
const CUSTOM_FIELD_LABELS: Record<string, string> = {
  cf1: 'Formula',
  cf2: 'Why its taken',
  cf3: 'With what it should be taken',
  cf4: 'When it should be taken',
  cf5: 'For which disease',
  cf6: 'Whom should take it',
  cf7: 'Mutually Exclusive to which other medicines',
  cf8: 'Food and Drink restrictions',
  cf9: 'Any specific Ethnicity based restrictions',
  cf10: 'Female restriction',
  cf11: 'Side affects',
};
const CUSTOM_FIELD_KEYS = Object.keys(CUSTOM_FIELD_LABELS) as CustomFieldKey[];

type CustomFieldKey =
  | 'cf1'
  | 'cf2'
  | 'cf3'
  | 'cf4'
  | 'cf5'
  | 'cf6'
  | 'cf7'
  | 'cf8'
  | 'cf9'
  | 'cf10'
  | 'cf11';

/** Prescription field keys (all strings). */
const PRESCRIPTION_KEYS = [
  'composition',
  'strength',
  'unitType',
  'formulation',
  'route',
  'frequency',
  'numberOfDays',
  'prescriptionQuantity',
  'refills',
  'refillTimes',
  'prescriptionNotes',
] as const;

interface FormValues {
  // General
  type: string;
  name: string;
  code: string;
  barcodeSymbology: string;
  categoryId: string;
  subCategoryId: string;
  unitId: string;
  packSize: string;
  salesMethod: string;
  alertQuantity: string;
  isStockTracked: boolean;
  brandId: string;

  // Images
  imageUrl: string;
  galleryImageUrls: string[];

  // Pricing
  packCost: string;
  cost: string;
  packMrp: string;
  price: string;
  taxRateId: string;
  hsnCode: string;
  taxMethod: string;
  taxMethodPurchase: string;

  // Prescription (gated)
  composition: string;
  strength: string;
  unitType: string;
  formulation: string;
  route: string;
  frequency: string;
  numberOfDays: string;
  prescriptionQuantity: string;
  refills: string;
  refillTimes: string;
  prescriptionNotes: string;

  // Custom fields (gated)
  cf1: string;
  cf2: string;
  cf3: string;
  cf4: string;
  cf5: string;
  cf6: string;
  cf7: string;
  cf8: string;
  cf9: string;
  cf10: string;
  cf11: string;

  // Other
  description: string;
  invoiceDetails: string;

  // Flags
  isActive: boolean;
  isTaxIncluded: boolean;
  isSerialized: boolean;

  // Variants
  variants: {
    name: string;
    sku: string;
    costAdjustment: string;
    priceAdjustment: string;
  }[];
}

const EMPTY: FormValues = {
  type: 'standard',
  name: '',
  code: '',
  barcodeSymbology: 'code128',
  categoryId: '',
  subCategoryId: '',
  unitId: '',
  packSize: '',
  salesMethod: 'INDIVIDUAL',
  alertQuantity: '0',
  isStockTracked: true,
  brandId: '',

  imageUrl: '',
  galleryImageUrls: [],

  packCost: '0',
  cost: '0',
  packMrp: '0',
  price: '0',
  taxRateId: '',
  hsnCode: '',
  taxMethod: 'EXCLUSIVE',
  taxMethodPurchase: 'EXCLUSIVE',

  composition: '',
  strength: '',
  unitType: '',
  formulation: '',
  route: '',
  frequency: '',
  numberOfDays: '',
  prescriptionQuantity: '',
  refills: '',
  refillTimes: '',
  prescriptionNotes: '',

  cf1: '',
  cf2: '',
  cf3: '',
  cf4: '',
  cf5: '',
  cf6: '',
  cf7: '',
  cf8: '',
  cf9: '',
  cf10: '',
  cf11: '',

  description: '',
  invoiceDetails: '',

  isActive: true,
  isTaxIncluded: false,
  isSerialized: false,

  variants: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductDetail | null;
}

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const textareaCls =
  'flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

/** Render a flat `<option>` list (with a leading blank). */
function renderOptions(options: Option[]) {
  return options.map((o) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  ));
}

/** Render `<optgroup>`-grouped options (for Unit Type / Formulation). */
function renderGroups(groups: OptionGroup[]) {
  return groups.map((g) => (
    <optgroup key={g.label} label={g.label}>
      {renderOptions(g.options)}
    </optgroup>
  ));
}

/**
 * Create/edit dialog for a product — full EZ Health Track business parity:
 * General / Images / Pricing / Prescription (gated) / Custom fields (gated) /
 * Other / Variants. Enum values are sent exactly as the backend expects and
 * empty optionals are omitted from the request body.
 */
export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = !!product;
  const create = useCreateProduct();
  const update = useUpdateProduct();

  const [showPrescription, setShowPrescription] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, reset, control, watch, setValue } =
    useForm<FormValues>({ defaultValues: EMPTY });
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  const imageUrl = watch('imageUrl');
  const galleryImageUrls = watch('galleryImageUrls');

  useEffect(() => {
    if (!open) return;
    if (product) {
      const hasPrescription = PRESCRIPTION_KEYS.some((k) => !!product[k]);
      const hasCustom = CUSTOM_FIELD_KEYS.some((k) => !!product[k]);
      setShowPrescription(hasPrescription);
      setShowCustom(hasCustom);
      reset({
        type: product.type,
        name: product.name,
        code: product.code,
        barcodeSymbology: product.barcodeSymbology ?? 'code128',
        categoryId: product.categoryId ?? product.category?.id ?? '',
        subCategoryId: product.subCategoryId ?? '',
        unitId: product.unitId ?? '',
        packSize: product.packSize ?? '',
        salesMethod: product.salesMethod ?? 'INDIVIDUAL',
        alertQuantity: String(product.alertQuantity),
        isStockTracked: product.isStockTracked,
        brandId: product.brandId ?? '',

        imageUrl: product.imageUrl ?? '',
        galleryImageUrls: product.galleryImageUrls ?? [],

        packCost: String(product.packCost ?? 0),
        cost: String(product.cost),
        packMrp: String(product.packMrp ?? 0),
        price: String(product.price),
        taxRateId: product.taxRateId ?? '',
        hsnCode: product.hsnCode ?? '',
        taxMethod: product.taxMethod ?? 'EXCLUSIVE',
        taxMethodPurchase: product.taxMethodPurchase ?? 'EXCLUSIVE',

        composition: product.composition ?? '',
        strength: product.strength ?? '',
        unitType: product.unitType ?? '',
        formulation: product.formulation ?? '',
        route: product.route ?? '',
        frequency: product.frequency ?? '',
        numberOfDays: product.numberOfDays ?? '',
        prescriptionQuantity: product.prescriptionQuantity ?? '',
        refills: product.refills ?? '',
        refillTimes: product.refillTimes ?? '',
        prescriptionNotes: product.prescriptionNotes ?? '',

        cf1: product.cf1 ?? '',
        cf2: product.cf2 ?? '',
        cf3: product.cf3 ?? '',
        cf4: product.cf4 ?? '',
        cf5: product.cf5 ?? '',
        cf6: product.cf6 ?? '',
        cf7: product.cf7 ?? '',
        cf8: product.cf8 ?? '',
        cf9: product.cf9 ?? '',
        cf10: product.cf10 ?? '',
        cf11: product.cf11 ?? '',

        description: product.description ?? '',
        invoiceDetails: product.invoiceDetails ?? '',

        isActive: product.isActive,
        isTaxIncluded: product.isTaxIncluded,
        isSerialized: product.isSerialized ?? false,

        variants: product.variants.map((v) => ({
          name: v.name,
          sku: v.sku ?? '',
          costAdjustment: String(v.costAdjustment),
          priceAdjustment: String(v.priceAdjustment),
        })),
      });
    } else {
      setShowPrescription(false);
      setShowCustom(false);
      reset(EMPTY);
    }
  }, [open, product, reset]);

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadAttachment(file);
      setValue('imageUrl', url, { shouldDirty: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not upload image'));
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadAttachment(file));
      }
      setValue('galleryImageUrls', [...(galleryImageUrls ?? []), ...uploaded], {
        shouldDirty: true,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not upload image(s)'));
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removeGalleryImage = (idx: number) => {
    setValue(
      'galleryImageUrls',
      (galleryImageUrls ?? []).filter((_, i) => i !== idx),
      { shouldDirty: true },
    );
  };

  const submit = handleSubmit(async (v) => {
    /** Add a trimmed string to the payload only when non-empty. */
    const payload: Record<string, unknown> = {
      // General — enums sent verbatim.
      type: v.type,
      name: v.name,
      code: v.code,
      barcodeSymbology: v.barcodeSymbology,
      categoryId: v.categoryId,
      salesMethod: v.salesMethod,
      alertQuantity: Number(v.alertQuantity || 0),
      isStockTracked: v.isStockTracked,

      // Pricing — numbers.
      packCost: Number(v.packCost || 0),
      cost: Number(v.cost || 0),
      packMrp: Number(v.packMrp || 0),
      price: Number(v.price || 0),
      taxMethod: v.taxMethod,
      taxMethodPurchase: v.taxMethodPurchase,

      // Flags.
      isActive: v.isActive,
      isTaxIncluded: v.isTaxIncluded,
      isSerialized: v.isSerialized,

      // Images.
      imageUrl: v.imageUrl || undefined,
      galleryImageUrls: v.galleryImageUrls,

      // Variants.
      variants: v.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku || undefined,
        costAdjustment: Number(variant.costAdjustment || 0),
        priceAdjustment: Number(variant.priceAdjustment || 0),
      })),
    };

    // Optional reference ids — omit empties.
    const optionalRefs: (keyof FormValues)[] = [
      'subCategoryId',
      'unitId',
      'brandId',
      'taxRateId',
    ];
    for (const key of optionalRefs) {
      const val = v[key];
      if (typeof val === 'string' && val) payload[key] = val;
    }

    // Optional string fields — omit empties.
    const optionalStrings: (keyof FormValues)[] = [
      'packSize',
      'hsnCode',
      'description',
      'invoiceDetails',
      ...PRESCRIPTION_KEYS,
      ...CUSTOM_FIELD_KEYS,
    ];
    for (const key of optionalStrings) {
      const val = v[key];
      if (typeof val === 'string' && val) payload[key] = val;
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          {/* ── General ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">General</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <select id="type" className={selectCls} {...register('type')}>
                  <option value="branded">Branded</option>
                  <option value="generic">Generic</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barcodeSymbology">Barcode symbology</Label>
                <select
                  id="barcodeSymbology"
                  className={selectCls}
                  {...register('barcodeSymbology')}
                >
                  <option value="code25">Code 25</option>
                  <option value="code39">Code 39</option>
                  <option value="code128">Code 128</option>
                  <option value="ean8">EAN-8</option>
                  <option value="ean13">EAN-13</option>
                  <option value="upca">UPC-A</option>
                  <option value="upce">UPC-E</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" {...register('code', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoryId">Category</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <InfiniteSelect
                      id="categoryId"
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        setValue('subCategoryId', '');
                      }}
                      queryKey={['categories']}
                      path="/categories"
                      getOptionValue={(c: { id: string }) => c.id}
                      getOptionLabel={(c: { name: string }) => c.name}
                      selectedLabel={product?.category?.name}
                      placeholder="—"
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subCategoryId">Sub-category</Label>
                <Controller
                  control={control}
                  name="subCategoryId"
                  render={({ field }) => (
                    <InfiniteSelect
                      id="subCategoryId"
                      value={field.value}
                      onChange={field.onChange}
                      queryKey={['sub-categories']}
                      path="/sub-categories"
                      getOptionValue={(s: { id: string }) => s.id}
                      getOptionLabel={(s: { name: string }) => s.name}
                      selectedLabel={product?.subCategory?.name}
                      extra={{ categoryId: watch('categoryId') || undefined }}
                      placeholder="—"
                      clearable
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitId">Unit</Label>
                <Controller
                  control={control}
                  name="unitId"
                  render={({ field }) => (
                    <InfiniteSelect
                      id="unitId"
                      value={field.value}
                      onChange={field.onChange}
                      queryKey={['units']}
                      path="/units"
                      getOptionValue={(u: { id: string }) => u.id}
                      getOptionLabel={(u: { name: string }) => u.name}
                      selectedLabel={product?.unit?.name}
                      placeholder="—"
                      clearable
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="packSize">Pack size</Label>
                <Input id="packSize" {...register('packSize')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salesMethod">Sales method</Label>
                <select
                  id="salesMethod"
                  className={selectCls}
                  {...register('salesMethod')}
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="PACK">Pack</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alertQuantity">Alert quantity</Label>
                <Input
                  id="alertQuantity"
                  type="number"
                  step="any"
                  {...register('alertQuantity')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brandId">Brand</Label>
                <Controller
                  control={control}
                  name="brandId"
                  render={({ field }) => (
                    <InfiniteSelect
                      id="brandId"
                      value={field.value}
                      onChange={field.onChange}
                      queryKey={['brands']}
                      path="/brands"
                      getOptionValue={(b: { id: string }) => b.id}
                      getOptionLabel={(b: { name: string }) => b.name}
                      selectedLabel={product?.brand?.name}
                      placeholder="—"
                      clearable
                    />
                  )}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isStockTracked')} /> Track
              quantity
            </label>
          </section>

          {/* ── Images ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Images</h3>
            {/* Hidden native inputs; visible buttons below trigger them. */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleGalleryUpload(e.target.files)}
            />

            <div className="space-y-2">
              <Label>Product image</Label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={imageUrl}
                      alt="Product"
                      className="h-24 w-24 rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setValue('imageUrl', '', { shouldDirty: true })
                      }
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {uploadingImage
                    ? 'Uploading…'
                    : imageUrl
                      ? 'Change image'
                      : 'Upload image'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gallery images</Label>
              {(galleryImageUrls?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {galleryImageUrls.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative">
                      <img
                        src={url}
                        alt={`Gallery ${i + 1}`}
                        className="h-20 w-20 rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(i)}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                        aria-label="Remove gallery image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingGallery}
                onClick={() => galleryInputRef.current?.click()}
              >
                {uploadingGallery ? 'Uploading…' : 'Add images'}
              </Button>
            </div>
          </section>

          {/* ── Pricing ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="packCost">Pack cost</Label>
                <Input
                  id="packCost"
                  type="number"
                  step="any"
                  {...register('packCost')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Unit cost</Label>
                <Input id="cost" type="number" step="any" {...register('cost')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="packMrp">Pack MRP</Label>
                <Input
                  id="packMrp"
                  type="number"
                  step="any"
                  {...register('packMrp')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Unit MRP</Label>
                <Input
                  id="price"
                  type="number"
                  step="any"
                  {...register('price')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxRateId">Product tax</Label>
                <Controller
                  control={control}
                  name="taxRateId"
                  render={({ field }) => (
                    <InfiniteSelect
                      id="taxRateId"
                      value={field.value}
                      onChange={field.onChange}
                      queryKey={['tax-rates']}
                      path="/tax-rates"
                      getOptionValue={(t: { id: string }) => t.id}
                      getOptionLabel={(t: { name: string }) => t.name}
                      selectedLabel={product?.taxRate?.name}
                      placeholder="—"
                      clearable
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hsnCode">HSN code</Label>
                <Input id="hsnCode" {...register('hsnCode')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxMethod">Tax method (sales)</Label>
                <select
                  id="taxMethod"
                  className={selectCls}
                  {...register('taxMethod')}
                >
                  <option value="INCLUSIVE">Inclusive</option>
                  <option value="EXCLUSIVE">Exclusive</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxMethodPurchase">Tax method (purchase)</Label>
                <select
                  id="taxMethodPurchase"
                  className={selectCls}
                  {...register('taxMethodPurchase')}
                >
                  <option value="INCLUSIVE">Inclusive</option>
                  <option value="EXCLUSIVE">Exclusive</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── Prescription Fields (gated) ── */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showPrescription}
                onChange={(e) => setShowPrescription(e.target.checked)}
              />
              Prescription Fields
            </label>
            {showPrescription && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="composition">Composition</Label>
                  <Input id="composition" {...register('composition')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="strength">Strength</Label>
                  <Input id="strength" {...register('strength')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unitType">Unit Type</Label>
                  <select id="unitType" className={selectCls} {...register('unitType')}>
                    <option value="">Select…</option>
                    {renderGroups(UNIT_TYPE_GROUPS)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="formulation">Formulations</Label>
                  <select id="formulation" className={selectCls} {...register('formulation')}>
                    <option value="">Select…</option>
                    {renderGroups(FORMULATION_GROUPS)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="route">Route</Label>
                  <select id="route" className={selectCls} {...register('route')}>
                    <option value="">Select…</option>
                    {renderOptions(ROUTE_OPTIONS)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frequency">Frequency</Label>
                  <select id="frequency" className={selectCls} {...register('frequency')}>
                    <option value="">Select…</option>
                    {renderOptions(FREQUENCY_OPTIONS)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numberOfDays">Number of Days</Label>
                  <Input id="numberOfDays" type="number" {...register('numberOfDays')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prescriptionQuantity">
                    Prescription Quantity
                  </Label>
                  <Input
                    id="prescriptionQuantity"
                    type="number"
                    {...register('prescriptionQuantity')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="refills">Refill</Label>
                  <select id="refills" className={selectCls} {...register('refills')}>
                    <option value="">Select…</option>
                    {renderOptions(REFILL_OPTIONS)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="refillTimes">Refill Times</Label>
                  <Input
                    id="refillTimes"
                    type="number"
                    disabled={watch('refills') !== 'Yes'}
                    {...register('refillTimes')}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="prescriptionNotes">Prescription Notice</Label>
                  <select
                    id="prescriptionNotes"
                    className={selectCls}
                    {...register('prescriptionNotes')}
                  >
                    <option value="">Select…</option>
                    {renderOptions(PRESCRIPTION_NOTE_OPTIONS)}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* ── Custom Fields (gated) ── */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showCustom}
                onChange={(e) => setShowCustom(e.target.checked)}
              />
              Custom Fields
            </label>
            {showCustom && (
              <div className="grid grid-cols-2 gap-4">
                {CUSTOM_FIELD_KEYS.map((key) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{CUSTOM_FIELD_LABELS[key]}</Label>
                    <Input id={key} {...register(key)} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Other ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Other</h3>
            <div className="space-y-1.5">
              <Label htmlFor="description">Product Details</Label>
              <textarea
                id="description"
                className={textareaCls}
                {...register('description')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoiceDetails">Product Details for Invoice</Label>
              <textarea
                id="invoiceDetails"
                className={textareaCls}
                {...register('invoiceDetails')}
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('isActive')} /> Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('isTaxIncluded')} /> Tax
                included
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('isSerialized')} />{' '}
                Serial-tracked
              </label>
            </div>
          </section>

          {/* ── Variants ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variants</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    name: '',
                    sku: '',
                    costAdjustment: '0',
                    priceAdjustment: '0',
                  })
                }
              >
                <Plus className="h-4 w-4" /> Add variant
              </Button>
            </div>
            {fields.map((f, i) => (
              <div
                key={f.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2"
              >
                <Input placeholder="Name" {...register(`variants.${i}.name`)} />
                <Input placeholder="SKU" {...register(`variants.${i}.sku`)} />
                <Input
                  placeholder="Cost +/-"
                  type="number"
                  step="any"
                  {...register(`variants.${i}.costAdjustment`)}
                />
                <Input
                  placeholder="Price +/-"
                  type="number"
                  step="any"
                  {...register(`variants.${i}.priceAdjustment`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </section>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
