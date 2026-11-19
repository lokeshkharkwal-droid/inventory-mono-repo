import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { RotateCcw, Trash2 } from 'lucide-react';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { NotesRichTextEditor } from '@/components/shared/NotesRichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useTaxRates } from '@/features/_shared/options';
import { computeOrder } from '@/features/orders/totals';
import type { ProductListRow } from '@/features/products/api';
import { ProductSearchAdd } from './ProductSearchAdd';
import {
  useCreateProforma,
  useUpdateProforma,
  type ProformaDetail,
} from './api';

/*
 * kaltros design tokens for this form, layered over the shared `Input` / `Select`
 * primitives: compact 36px rounded-md fields with an indigo focus ring, and 32px
 * controls inside the order-items table.
 */
const LABEL = 'mb-1.5 block text-xs font-medium text-gray-700';
const FOCUS =
  'focus-visible:border-indigo-400 focus-visible:ring-indigo-500/30';
const FIELD = `h-9 rounded-md border-gray-200 px-3 text-gray-800 ${FOCUS}`;
const FIELD_SELECT = `h-9 rounded-md border-gray-200 pl-3 text-gray-800 ${FOCUS}`;
const FIELD_ERROR =
  'border-red-500 hover:border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30';
const CELL = `h-8 rounded-md border-gray-200 px-2 py-1 text-xs ${FOCUS}`;
const CELL_SELECT = `h-8 rounded-md border-gray-200 py-1 pl-2 pr-8 text-xs ${FOCUS}`;
/** The shared InfiniteSelect (Customer) trigger, matched to `FIELD`. */
const PICKER = [
  '[&>button]:h-9 [&>button]:rounded-md [&>button]:border-gray-200 [&>button]:text-gray-800',
  '[&>button]:shadow-xs [&>button]:transition-colors [&>button:hover]:border-gray-300',
  '[&>button:focus-visible]:border-indigo-400 [&>button:focus-visible]:outline-none',
  '[&>button:focus-visible]:ring-2 [&>button:focus-visible]:ring-indigo-500/30',
].join(' ');

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  quantity: string;
  quantityMethod: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
  taxRate: string;
}
interface LabRow {
  name: string;
  price: string;
  type: string;
}

interface FormValues {
  name: string;
  customerId: string;
  reference: string;
  date: string;
  status: string;
  /** Not editable on this form; carried through from a loaded proforma (edit). */
  orderDiscount: string;
  /** Not editable on this form; carried through from a loaded proforma (edit). */
  shipping: string;
  /** Rich-text HTML from the TinyMCE editor ("More Options" → Note). */
  note: string;
  items: LineRow[];
  /** Not editable on this form; carried through from a loaded proforma (edit). */
  labTests: LabRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  quantity: '1',
  quantityMethod: '1',
  unitPrice: '0',
  discount: '0',
  taxRateId: '',
  taxRate: '0',
};

/**
 * A date as `YYYY-MM-DD` in the user's local time zone (the date input's
 * format) — the same calendar day the proforma list shows for it.
 */
function localIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as `YYYY-MM-DD` (local). */
function today(): string {
  return localIsoDate(new Date());
}

function defaults(): FormValues {
  return {
    name: '',
    customerId: '',
    reference: '',
    date: today(),
    status: 'ACTIVE',
    orderDiscount: '0',
    shipping: '0',
    note: '',
    items: [],
    labTests: [],
  };
}

/** Map a loaded proforma (edit mode) into the form's string-based shape. */
export function toFormValues(p: ProformaDetail): FormValues {
  return {
    name: p.name ?? '',
    customerId: '',
    reference: p.reference,
    // Local calendar day (not the UTC one) so it matches the list's date.
    date: p.date ? localIsoDate(new Date(p.date)) : '',
    status: p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    orderDiscount: String(Number(p.orderDiscount ?? 0) || 0),
    shipping: String(Number(p.shipping ?? 0) || 0),
    note: p.note ?? '',
    items: (p.items ?? []).map((it) => ({
      productId: it.productId,
      productName: it.productName,
      productCode: it.productCode ?? '',
      quantity: String(Number(it.quantity)),
      quantityMethod: String(it.quantityMethod ?? 1),
      unitPrice: String(Number(it.unitPrice)),
      discount: String(Number(it.discount ?? 0)),
      taxRateId: '',
      taxRate: String(Number(it.taxRate ?? 0)),
    })),
    labTests: Array.isArray(p.labTests)
      ? p.labTests
          .filter((l) => l?.name)
          .map((l) => ({
            name: l.name,
            price: String(Number(l.price ?? 0) || 0),
            type: l.type || 'LAB_TEST',
          }))
      : [],
  };
}

interface Props {
  /** Called after a successful save or on cancel. */
  onDone: () => void;
  /** When set, the form edits this proforma (EZHT `proformas/edit`) instead of creating. */
  proformaId?: string;
  /** Prefill values (edit mode). */
  initialValues?: FormValues;
}

/**
 * Proforma form — EZ Health Track `proformas/add` / `proformas/edit` parity, laid
 * out like the legacy page and styled in the kaltros design language. A named proforma
 * (title, date, status, customer, reference) whose products are added from the
 * barcode / search box into the order-items table (net unit price, quantity,
 * quantity method Single/Combined, discount, tax and a live per-line subtotal),
 * an optional rich-text Note under "More Options", and a sticky totals bar with
 * Reset / Submit. In edit mode (`proformaId`) it updates in place.
 */
export function ProformaForm({ onDone, proformaId, initialValues }: Props) {
  const isEdit = Boolean(proformaId);
  const create = useCreateProforma();
  const update = useUpdateProforma(proformaId ?? '');
  const mutation = isEdit ? update : create;
  const { data: taxRates } = useTaxRates();
  const [moreOptions, setMoreOptions] = useState(Boolean(initialValues?.note));
  /** Bumped by Reset to clear the product search box. */
  const [searchKey, setSearchKey] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: initialValues ?? defaults(),
  });

  // Edit mode: once tax rates load, resolve each line's `taxRateId` from its rate
  // so the tax dropdown reflects the saved tax (the subtotal already uses `taxRate`).
  const resolveTaxRateIds = useCallback(() => {
    if (!isEdit || !taxRates?.length || !initialValues) return;
    initialValues.items.forEach((it, i) => {
      const rate = Number(it.taxRate || 0);
      if (rate > 0) {
        const match = taxRates.find((t) => Number(t.rate) === rate);
        if (match) setValue(`items.${i}.taxRateId`, match.id);
      }
    });
  }, [isEdit, taxRates, initialValues, setValue]);
  useEffect(() => resolveTaxRateIds(), [resolveTaxRateIds]);

  const items = useFieldArray({ control, name: 'items' });

  // useWatch re-renders reliably on nested field-array edits (plain watch() does
  // not), so the per-line subtotals and the totals summary stay in sync.
  const live = useWatch({ control }) as Partial<FormValues>;
  const watchedItems = useMemo(() => live.items ?? [], [live.items]);

  const totals = useMemo(
    () =>
      computeOrder({
        lines: watchedItems.map((l) => ({
          quantity: Number(l?.quantity || 0),
          unitPrice: Number(l?.unitPrice || 0),
          discount: l?.discount,
          taxRatePercent: Number(l?.taxRate || 0),
        })),
        orderDiscount: live.orderDiscount,
        shipping: Number(live.shipping || 0),
      }),
    [watchedItems, live.orderDiscount, live.shipping],
  );
  /** Sum of the line subtotals (tax included) — the legacy "Total". */
  const linesTotal = totals.lines.reduce((s, l) => s + l.subtotal, 0);
  /**
   * Clinical (lab / radiology / blood) lines carried through from an older
   * proforma. No longer editable here, but the server adds their prices to the
   * total, so they're shown (read-only) and counted to keep the preview honest.
   */
  const labTotal = (live.labTests ?? []).reduce(
    (s, l) => s + (Number(l?.price) || 0),
    0,
  );
  const grandTotal = totals.grandTotal + labTotal;

  /**
   * Add a product picked in the search box. Like the legacy form, a product
   * already on a "Combined" line just gets +1 quantity; otherwise (Single) it
   * gets a line of its own.
   */
  const addProduct = (p: ProductListRow) => {
    const rows = getValues('items');
    const combined = rows.findIndex(
      (r) => r.productId === p.id && r.quantityMethod === '2',
    );
    if (combined >= 0) {
      const qty = Number(rows[combined]?.quantity || 0) + 1;
      setValue(`items.${combined}.quantity`, String(qty), {
        shouldDirty: true,
      });
      return;
    }
    items.append(
      {
        ...EMPTY_ROW,
        productId: p.id,
        productName: p.name,
        productCode: p.code ?? '',
        unitPrice: String(p.price ?? 0),
      },
      { shouldFocus: false },
    );
  };

  /** Reset (legacy red button): back to a blank form, or to the loaded proforma. */
  const onReset = () => {
    reset(initialValues ?? defaults());
    resolveTaxRateIds();
    setMoreOptions(Boolean(initialValues?.note));
    setSearchKey((k) => k + 1);
  };

  const submit = handleSubmit(async (v) => {
    const productItems = v.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity || 0),
        quantityMethod: Number(i.quantityMethod || 1),
        unitPrice: Number(i.unitPrice || 0),
        taxRate: Number(i.taxRate || 0),
        discount: Number(i.discount || 0),
      }));
    if (productItems.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    const labTests = v.labTests
      .filter((l) => l.name)
      .map((l) => ({
        name: l.name,
        price: Number(l.price || 0),
        type: l.type || 'LAB_TEST',
      }));
    // Add mode: the Date box is prefilled with today; left as-is, let the server
    // stamp the current time exactly as it did when Date was left blank.
    const date =
      !isEdit && v.date === today() ? undefined : v.date || undefined;
    const payload = {
      name: v.name,
      customerId: v.customerId || undefined,
      status: v.status || undefined,
      reference: v.reference || undefined,
      date,
      orderDiscount: Number(v.orderDiscount || 0) || undefined,
      shipping: Number(v.shipping || 0) || undefined,
      note: v.note || undefined,
      items: productItems,
      labTests: labTests.length ? labTests : undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync(payload);
        toast.success('Proforma updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Proforma created');
        reset(defaults());
      }
      onDone();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isEdit ? 'Could not update proforma' : 'Could not create proforma',
        ),
      );
    }
  });

  return (
    <form onSubmit={submit} className="text-gray-800">
      <div className="space-y-6 p-4 sm:p-5">
        {/* ── Header fields ── */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="name" required>
              Name
            </FieldLabel>
            <Input
              id="name"
              placeholder="Proforma name"
              className={cn(FIELD, errors.name && FIELD_ERROR)}
              aria-invalid={errors.name ? true : undefined}
              {...register('name', { required: true })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">
                Please enter/select a value
              </p>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="date">Date</FieldLabel>
            <Input
              id="date"
              type="date"
              className={FIELD}
              {...register('date')}
            />
          </div>
          <div>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select
              id="status"
              className={FIELD_SELECT}
              {...register('status')}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="customerId">Customer</FieldLabel>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <InfiniteSelect
                  id="customerId"
                  className={PICKER}
                  value={field.value}
                  onChange={field.onChange}
                  queryKey={['customers']}
                  path="/customers"
                  getOptionValue={(c) => c.id}
                  getOptionLabel={(c) => c.name}
                  placeholder="Select customer…"
                  clearable
                />
              )}
            />
          </div>
          <div>
            <FieldLabel htmlFor="reference">Reference</FieldLabel>
            <Input
              id="reference"
              className={FIELD}
              placeholder="Auto if blank"
              {...register('reference')}
            />
          </div>
        </div>

        {/* ── Order items: product search (barcode / name / code) + table ── */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-gray-700">
              Order Items <span className="text-red-500">*</span>
            </h3>
            {items.fields.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {items.fields.length}{' '}
                {items.fields.length === 1 ? 'product' : 'products'}
              </span>
            )}
          </div>
          <div className="mb-3">
            <ProductSearchAdd key={searchKey} onAdd={addProduct} />
          </div>
          <div className="relative overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="bg-blue-50">
                <tr>
                  <Th>Product Name (Product Code)</Th>
                  <Th className="w-[110px] text-right">Net Unit Price</Th>
                  <Th className="w-[80px] text-center">Quantity</Th>
                  <Th className="w-[120px]">Quantity Method</Th>
                  <Th className="w-[90px] text-right">Discount</Th>
                  <Th className="w-[180px]">Product Tax</Th>
                  <Th className="w-[100px] text-right">Subtotal</Th>
                  <Th className="w-[40px]">
                    <span className="sr-only">Remove</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.fields.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-gray-400"
                    >
                      No products added — search above to add products
                    </td>
                  </tr>
                )}
                {items.fields.map((f, i) => {
                  const row = watchedItems[i];
                  const name = row?.productName ?? '';
                  return (
                    <tr
                      key={f.id}
                      className="transition-colors hover:bg-blue-50/30"
                    >
                      <td className="px-3 py-1.5">
                        <span className="font-medium text-gray-800">
                          {name}
                        </span>
                        {row?.productCode && (
                          <span className="text-gray-500">
                            {' '}
                            ({row.productCode})
                          </span>
                        )}
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="any"
                          className={cn(CELL, 'text-right')}
                          aria-label={`Net unit price — ${name}`}
                          {...register(`items.${i}.unitPrice`)}
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          type="number"
                          step="any"
                          className={cn(CELL, 'text-center')}
                          aria-label={`Quantity — ${name}`}
                          {...register(`items.${i}.quantity`)}
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Select
                          className={CELL_SELECT}
                          aria-label={`Quantity method — ${name}`}
                          {...register(`items.${i}.quantityMethod`)}
                        >
                          <option value="1">Single</option>
                          <option value="2">Combined</option>
                        </Select>
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Input
                          className={cn(CELL, 'text-right')}
                          placeholder="0 or 5%"
                          aria-label={`Discount — ${name}`}
                          {...register(`items.${i}.discount`)}
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <Select
                          className={CELL_SELECT}
                          aria-label={`Product tax — ${name}`}
                          value={row?.taxRateId ?? ''}
                          onChange={(e) => {
                            const tr = (taxRates ?? []).find(
                              (t) => t.id === e.target.value,
                            );
                            setValue(`items.${i}.taxRateId`, e.target.value);
                            setValue(
                              `items.${i}.taxRate`,
                              tr ? String(tr.rate) : '0',
                            );
                          }}
                        >
                          <option value="">No tax</option>
                          {(taxRates ?? []).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.rate}%)
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums text-gray-800">
                        {(totals.lines[i]?.subtotal ?? 0).toFixed(2)}
                      </td>
                      <td className="px-1.5 py-1.5 text-center">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                          aria-label={`Remove ${name}`}
                          title="Remove"
                          onClick={() => items.remove(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {items.fields.length > 0 && (
                <tfoot className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-800">
                  <tr>
                    <td colSpan={2} className="px-3 py-2.5">
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {Number(totals.totalItems.toFixed(2))}
                    </td>
                    <td />
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {totals.productDiscount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {totals.productTax.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {linesTotal.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        {/* ── More options (Note only) ── */}
        <section>
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-indigo-500"
              checked={moreOptions}
              onChange={(e) => setMoreOptions(e.target.checked)}
            />
            More Options
          </label>
          {moreOptions && (
            <div className="mt-3">
              <span className={LABEL}>Note</span>
              <Controller
                control={control}
                name="note"
                render={({ field }) => (
                  <NotesRichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add a note…"
                    minHeight={120}
                    maxHeight={420}
                  />
                )}
              />
            </div>
          )}
        </section>
      </div>

      {/*
        ── Totals + actions ──
        From tablet width up this bar is sticky inside AppLayout's scrolling
        <main>, whose padding (sm:p-6 / lg:p-8) sticky positioning respects — so
        it's pulled down by that padding (and pads itself by the same amount) to
        sit flush with the bottom edge. On phones it stays at the end of the form
        so it never covers the field being typed into.
      */}
      <div className="z-20 rounded-b-xl border-t border-gray-200 bg-white px-4 py-3 sm:sticky sm:-bottom-6 sm:px-5 sm:pb-9 sm:shadow-[0_-8px_16px_-12px_rgba(16,24,40,0.18)] lg:-bottom-8 lg:pb-11">
        <div
          className={cn(
            'grid grid-cols-2 gap-2 sm:grid-cols-3',
            labTotal > 0 ? 'xl:grid-cols-7' : 'xl:grid-cols-6',
          )}
        >
          <TotalCell
            label="Items"
            value={`${items.fields.length} (${totals.totalItems.toFixed(2)})`}
          />
          <TotalCell label="Total" value={linesTotal.toFixed(2)} />
          {labTotal > 0 && (
            <TotalCell label="Lab Tests" value={labTotal.toFixed(2)} />
          )}
          <TotalCell
            label="Order Discount"
            value={totals.orderDiscount.toFixed(2)}
          />
          <TotalCell label="Order Tax" value={totals.orderTax.toFixed(2)} />
          <TotalCell label="Shipping" value={totals.shipping.toFixed(2)} />
          <TotalCell
            label="Grand Total"
            value={grandTotal.toFixed(2)}
            highlight
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            onClick={onDone}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onReset}
            disabled={mutation.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={mutation.isPending}
            className="min-w-[96px] rounded-md bg-[linear-gradient(90deg,#3b82f6_0%,#6366f1_50%,#8b5cf6_100%)] text-white hover:bg-[linear-gradient(90deg,#2563eb_0%,#4f46e5_50%,#7c3aed_100%)]"
          >
            {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Submit'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Field label in the kaltros style (small, medium weight, red required star). */
function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className={LABEL}>
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </Label>
  );
}

/** Order-items header cell (kaltros table head: blue-50, small uppercase). */
function Th({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-blue-900/70',
        className,
      )}
    >
      {children}
    </th>
  );
}

/** One tile of the totals bar; `highlight` marks the Grand Total. */
function TotalCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border px-3 py-2',
        highlight
          ? 'border-blue-100 bg-blue-50 text-blue-900'
          : 'border-gray-200 bg-white text-gray-800',
      )}
    >
      <div
        className={cn(
          'truncate text-[11px] font-medium uppercase tracking-wide',
          highlight ? 'text-blue-900/70' : 'text-gray-500',
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 truncate tabular-nums',
          highlight ? 'text-base font-bold' : 'text-sm font-semibold',
        )}
      >
        {value}
      </div>
    </div>
  );
}
