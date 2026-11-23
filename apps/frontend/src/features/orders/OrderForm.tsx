import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { getApiErrorMessage, request } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { FieldError } from '@/components/ui/field-error';
import { useBranchOptions } from '@/features/_shared/branches';
import { useBillers, useTaxRates } from '@/features/_shared/options';
import { computeOrder } from './totals';
import {
  useSale,
  useCreateSale,
  useUpdateSale,
} from '@/features/sales/api';
import {
  usePurchase,
  useCreatePurchase,
  useUpdatePurchase,
} from '@/features/purchases/api';
import { useQuote } from '@/features/quotes/api';
import { BatchSearchSelect } from './BatchSearchSelect';
import { AddReferralDialog } from './AddReferralDialog';
import {
  ViewCustomerDialog,
  AddCustomerDialog,
} from '@/features/customers/ViewCustomerDialog';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm aria-[invalid=true]:border-destructive';
const inputSm = 'h-9';

type Mode = 'sale' | 'purchase';

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  optionId?: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
  taxRate: string;
  taxInclusive: boolean;
  hsnCode: string;
  batchNo: string;
  /** The chosen batch's id (sales only) — the server decrements exactly this batch. */
  batchId: string;
  partNo: string;
  expiryDate: string;
  packSize: string;
  packQuantity: string;
  mrp: string;
  freePackQuantity: string;
  /** Imaging/radiology exposures for this line (sales only) — Exposures report. */
  invExposure: string;
}

interface FormValues {
  partyId: string;
  warehouseId: string;
  billerId: string;
  reference: string;
  date: string;
  status: string;
  orderDiscount: string;
  orderTax: string;
  shipping: string;
  paymentTerm: string;
  gstNumber: string;
  gstState: string;
  interState: boolean;
  note: string;
  staffNote: string;
  orderTags: string;
  referralId: string;
  referralName: string;
  attachmentUrl: string;
  editNote: string;
  isBloodDonation: boolean;
  donorName: string;
  // Payment
  paymentStatus: string;
  paymentAmount: string;
  paidBy: string;
  chequeNo: string;
  ccNo: string;
  ccHolder: string;
  giftCardNo: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  optionId: '',
  quantity: '1',
  unitPrice: '0',
  discount: '0',
  taxRateId: '',
  taxRate: '0',
  taxInclusive: false,
  hsnCode: '',
  batchNo: '',
  batchId: '',
  partNo: '',
  expiryDate: '',
  packSize: '',
  packQuantity: '',
  mrp: '',
  freePackQuantity: '',
  invExposure: '',
};

function defaults(): FormValues {
  return {
    partyId: '',
    warehouseId: '',
    billerId: '',
    reference: '',
    date: '',
    status: '',
    orderDiscount: '0',
    orderTax: '0',
    shipping: '0',
    paymentTerm: '',
    gstNumber: '',
    gstState: '',
    interState: false,
    note: '',
    staffNote: '',
    orderTags: '',
    referralId: '',
    referralName: '',
    attachmentUrl: '',
    editNote: '',
    isBloodDonation: false,
    donorName: '',
    paymentStatus: 'due',
    paymentAmount: '0',
    paidBy: 'CASH',
    chequeNo: '',
    ccNo: '',
    ccHolder: '',
    giftCardNo: '',
    items: [{ ...EMPTY_ROW }],
  };
}

interface Props {
  mode: Mode;
  /** When set, edit this document instead of creating a new one. */
  editId?: string | null;
  /**
   * When set (and not editing), prefill a NEW sale/purchase from this quote and,
   * on save, mark the quote CONVERTED linking it to the created document
   * (EZHT "Create Invoice / Create Purchase" from a quotation).
   */
  fromQuoteId?: string | null;
}

/**
 * Full-page order form — the EZHT add/edit Sale & Purchase screen. One component
 * drives both: sales pick a Customer + Biller and remove stock (COMPLETED);
 * purchases pick a Supplier and add stock (RECEIVED). Line grid, more-options,
 * live totals and a payment block mirror the legacy layout.
 */
export function OrderForm({ mode, editId, fromQuoteId }: Props) {
  const isSale = mode === 'sale';
  const navigate = useNavigate();
  const prefillQuote = useQuote(!editId && fromQuoteId ? fromQuoteId : undefined);
  const { data: branches } = useBranchOptions();
  const { data: billers } = useBillers();
  const { data: taxRates } = useTaxRates();

  const saleDetail = useSale(isSale ? (editId ?? null) : null);
  const purchaseDetail = usePurchase(!isSale ? (editId ?? null) : null);
  const editing = isSale ? saleDetail.data : purchaseDetail.data;

  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const saving =
    createSale.isPending ||
    updateSale.isPending ||
    createPurchase.isPending ||
    updatePurchase.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: defaults(), mode: 'onTouched' });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Add-Sale inline dialogs (Referral / Patient) + a label cache so a freshly
  // added patient shows in the Customer select without a round-trip.
  const [addReferralOpen, setAddReferralOpen] = useState(false);
  const [viewCustomerOpen, setViewCustomerOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [pickedCustomerLabel, setPickedCustomerLabel] = useState('');

  // Default Date to NOW (date + time) for a NEW sale (EZHT preselects current
  // datetime). Only runs once, for creates — edits hydrate their own date.
  useEffect(() => {
    if (editId || !isSale) return;
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setValue('date', local);
  }, [editId, isSale, setValue]);

  // Hydrate when editing.
  useEffect(() => {
    if (!editId || !editing) return;
    // SaleDetail/PurchaseDetail diverge, so read the shared/union fields through
    // a loose record (via `unknown`, since neither type has a string index
    // signature); each access below is individually narrowed.
    const d = editing as unknown as Record<string, unknown>;
    const party = isSale
      ? (d.customer as { id: string } | null)?.id
      : (d.supplier as { id: string } | null)?.id;
    reset({
      ...defaults(),
      partyId: party ?? '',
      warehouseId: (d.branchId as string) ?? '',
      billerId: (d.billerId as string) ?? '',
      reference: (d.reference as string) ?? '',
      date: d.date ? String(d.date).slice(0, isSale ? 16 : 10) : '',
      status: (d.status as string) ?? '',
      orderDiscount: String(d.orderDiscountSpec ?? d.orderDiscount ?? 0),
      orderTax: String(d.orderTax ?? 0),
      shipping: String(d.shipping ?? 0),
      paymentTerm: d.paymentTerm != null ? String(d.paymentTerm) : '',
      gstNumber: (d.gstNumber as string) ?? '',
      gstState: (d.gstState as string) ?? '',
      interState: d.taxMethod === 'igst',
      note: (d.note as string) ?? '',
      staffNote: (d.staffNote as string) ?? '',
      orderTags: (d.orderTags as string) ?? '',
      referralId: (d.referralId as string) ?? '',
      referralName: (d.referralName as string) ?? '',
      attachmentUrl: (d.attachmentUrl as string) ?? '',
      isBloodDonation: Boolean(d.isBloodDonation),
      donorName: (d.donorName as string) ?? '',
      items: ((d.items as Record<string, unknown>[]) ?? []).map((i) => {
        // Purchase Rate/MRP columns show PACK values — reconstruct from the stored
        // per-unit cost/mrp × pack size; derive packQuantity from quantity when a
        // legacy row has none so the derived total quantity round-trips.
        const packSize = i.packSize != null ? Number(i.packSize) : 1;
        const size = packSize || 1;
        const qty = Number(i.quantity ?? 0);
        return {
          ...EMPTY_ROW,
          productId: String(i.productId ?? ''),
          productName: String(i.productName ?? ''),
          productCode: String(i.productCode ?? ''),
          optionId: String(i.optionId ?? ''),
          quantity: String(qty || 1),
          unitPrice: String(
            isSale ? (i.price ?? 0) : Number(i.cost ?? 0) * size,
          ),
          discount: String(i.discountSpec ?? i.discount ?? 0),
          taxRate: String(i.taxRate ?? 0),
          taxInclusive: i.taxMethod === '1',
          hsnCode: String(i.hsnCode ?? ''),
          batchNo: String((isSale ? i.serialNo : i.batchNo) ?? ''),
          batchId: String(i.batchId ?? ''),
          partNo: String(i.partNo ?? ''),
          expiryDate: i.expiryDate ? String(i.expiryDate).slice(0, 10) : '',
          packSize: i.packSize != null ? String(i.packSize) : '',
          packQuantity:
            i.packQuantity != null
              ? String(i.packQuantity)
              : isSale
                ? ''
                : String(qty / size),
          mrp: isSale
            ? i.mrp != null
              ? String(i.mrp)
              : ''
            : String(Number(i.mrp ?? 0) * size),
          freePackQuantity:
            i.freePackQuantity != null ? String(i.freePackQuantity) : '',
          invExposure: i.invExposure != null ? String(i.invExposure) : '',
        };
      }),
    });
  }, [editId, editing, isSale, reset]);

  // Prefill a NEW document from a quote (convert flow). Maps the quote's party,
  // lines (discount spec preserved), order discount, shipping and GST so the user
  // can review before saving — EZHT opens the add-form prefilled, not auto-create.
  useEffect(() => {
    if (editId || !fromQuoteId || !prefillQuote.data) return;
    const q = prefillQuote.data;
    const party = isSale ? q.customerId : q.supplierId;
    reset({
      ...defaults(),
      partyId: party ?? '',
      warehouseId: q.warehouseId ?? '',
      orderDiscount: q.orderDiscountSpec ?? String(q.orderDiscount ?? 0),
      orderTax: String(q.orderTaxPercent ?? 0),
      shipping: String(q.shipping ?? 0),
      gstNumber: q.gstNumber ?? '',
      gstState: q.gstState ?? '',
      note: `From quote ${q.reference}`,
      // Manual (off-catalogue) quote lines have no catalogue product → skip them;
      // a sale/purchase line needs a real product.
      items:
        q.items.filter((i) => i.productId).length > 0
          ? q.items
              .filter((i) => i.productId)
              .map((i) => ({
                ...EMPTY_ROW,
                productId: i.productId ?? '',
                productName: i.productName,
                productCode: i.productCode ?? '',
                quantity: String(i.quantity ?? 1),
                unitPrice: String(i.unitPrice ?? 0),
                discount: i.discountSpec ?? String(i.discount ?? 0),
                taxRate: String(i.taxRate ?? 0),
                packSize: i.packSize ?? '',
                packQuantity: i.packQuantity != null ? String(i.packQuantity) : '',
              }))
          : [{ ...EMPTY_ROW }],
    });
  }, [editId, fromQuoteId, prefillQuote.data, isSale, reset]);

  // useWatch re-renders reliably on nested field-array edits (plain watch() does
  // not), so the live per-line subtotals + order summary stay in sync.
  const live = useWatch({ control }) as Partial<FormValues>;
  const watchedItems = useMemo(() => live.items ?? [], [live.items]);
  const paymentStatus = live.paymentStatus ?? 'due';
  const paidBy = live.paidBy ?? 'CASH';

  // EZHT purchase "pack" model: the editable Rate/MRP columns hold PACK values and
  // the line quantity is derived from packs (packQuantity × packSize). The money
  // engine + stock remain per-unit, so we derive the per-unit cost and the total
  // unit quantity here. Sales stay exactly as entered (per-unit, explicit Qty).
  const packSizeOf = (l: Partial<LineRow>) => Number(l.packSize) || 1;
  const unitCostOf = (l: Partial<LineRow>) =>
    isSale ? Number(l.unitPrice) || 0 : (Number(l.unitPrice) || 0) / packSizeOf(l);
  const lineQtyOf = (l: Partial<LineRow>) =>
    isSale
      ? Number(l.quantity) || 0
      : (Number(l.packQuantity) || 0) * packSizeOf(l);

  const totals = useMemo(
    () =>
      computeOrder({
        lines: watchedItems.map((l) => ({
          quantity: lineQtyOf(l),
          unitPrice: unitCostOf(l),
          discount: l.discount,
          taxRatePercent: Number(l.taxRate || 0),
          taxInclusive: l.taxInclusive,
        })),
        orderDiscount: live.orderDiscount,
        orderTaxPercent: Number(live.orderTax || 0),
        shipping: Number(live.shipping || 0),
        interState: live.interState,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedItems, live.orderDiscount, live.orderTax, live.shipping, live.interState],
  );

  const submit = handleSubmit(async (v) => {
    const items = v.items
      .filter((i) => i.productId)
      .map((i) => {
        const base = {
          productId: i.productId,
          optionId: i.optionId || undefined,
          discount: i.discount || undefined,
          taxRate: Number(i.taxRate || 0),
          taxRateId: i.taxRateId || undefined,
          taxInclusive: i.taxInclusive || undefined,
          hsnCode: i.hsnCode || undefined,
          expiryDate: i.expiryDate || undefined,
          packSize: i.packSize ? Number(i.packSize) : undefined,
          packQuantity: i.packQuantity ? Number(i.packQuantity) : undefined,
        };
        if (isSale) {
          return {
            ...base,
            quantity: Number(i.quantity || 0),
            price: Number(i.unitPrice || 0),
            batchId: i.batchId || undefined,
            serialNo: i.batchNo || undefined,
            invExposure: i.invExposure ? Number(i.invExposure) : undefined,
          };
        }
        // Purchase: Rate = pack cost, MRP = pack MRP → derive the per-unit values
        // the backend stores; quantity = packs × pack size (EZHT).
        return {
          ...base,
          quantity: lineQtyOf(i),
          cost: unitCostOf(i),
          mrp: i.mrp ? Number(i.mrp) / packSizeOf(i) : undefined,
          freePackQuantity: i.freePackQuantity
            ? Number(i.freePackQuantity)
            : undefined,
          partNo: i.partNo || undefined,
          batchNo: i.batchNo || undefined,
        };
      });

    if (items.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }

    const payment =
      v.paymentStatus && v.paymentStatus !== 'due'
        ? {
            paymentStatus: v.paymentStatus,
            amount: Number(v.paymentAmount || 0),
            paidBy: v.paidBy,
            chequeNo: v.chequeNo || undefined,
            ccNo: v.ccNo || undefined,
            ccHolder: v.ccHolder || undefined,
            giftCardNo: v.giftCardNo || undefined,
          }
        : undefined;

    const common = {
      warehouseId: v.warehouseId || undefined,
      reference: v.reference || undefined,
      date: v.date || undefined,
      status: v.status || undefined,
      orderDiscount: v.orderDiscount || undefined,
      orderTax: Number(v.orderTax || 0),
      shipping: Number(v.shipping || 0),
      paymentTerm: v.paymentTerm ? Number(v.paymentTerm) : undefined,
      gstNumber: v.gstNumber || undefined,
      gstState: v.gstState || undefined,
      interState: v.interState || undefined,
      note: v.note || undefined,
      attachmentUrl: v.attachmentUrl || undefined,
      items,
      payment,
    };

    // After creating a doc from a quote, mark the quote CONVERTED + link it.
    const markQuoteConverted = async (convertedToId: string) => {
      if (editId || !fromQuoteId) return;
      try {
        await request('POST', `/quotes/${fromQuoteId}/mark-converted`, {
          body: { convertedToId },
        });
      } catch {
        toast.warning(
          'Document created, but the quote could not be marked converted.',
        );
      }
    };

    try {
      if (isSale) {
        const body = {
          ...common,
          customerId: v.partyId,
          billerId: v.billerId || undefined,
          staffNote: v.staffNote || undefined,
          orderTags: v.orderTags || undefined,
          referralId: v.referralId || undefined,
          referralName: v.referralName || undefined,
          ...(fromQuoteId && !editId ? { quoteId: fromQuoteId } : {}),
        };
        if (editId) {
          await updateSale.mutateAsync({ id: editId, input: body });
        } else {
          const created = (await createSale.mutateAsync(body)) as { id: string };
          await markQuoteConverted(created.id);
        }
        toast.success(editId ? 'Sale updated' : 'Sale created');
        navigate('/sales');
      } else {
        const body = {
          ...common,
          supplierId: v.partyId,
          editNote: editId ? v.editNote || undefined : undefined,
          isBloodDonation: v.isBloodDonation || undefined,
          donorName: v.isBloodDonation ? v.donorName || undefined : undefined,
        };
        if (editId) {
          await updatePurchase.mutateAsync({ id: editId, input: body });
        } else {
          const created = (await createPurchase.mutateAsync(body)) as {
            id: string;
          };
          await markQuoteConverted(created.id);
        }
        toast.success(editId ? 'Purchase updated' : 'Purchase created');
        navigate('/purchases');
      }
    } catch (err) {
      const mapped = applyApiFieldErrors(err, setError, {
        fields: ['partyId', 'warehouseId', 'date', 'billerId', 'status'],
      });
      if (!mapped) toast.error(getApiErrorMessage(err, 'Could not save'));
    }
  });

  const statusOptions = isSale
    ? [
        { v: 'COMPLETED', l: 'Completed (removes stock)' },
        { v: 'PENDING', l: 'Pending' },
      ]
    : [
        { v: 'RECEIVED', l: 'Received (adds stock)' },
        { v: 'ORDERED', l: 'Ordered' },
        { v: 'PENDING', l: 'Pending' },
      ];

  const paidByOptions = isSale
    ? ['CASH', 'CARD', 'CHEQUE', 'GIFT_CARD', 'BANK_TRANSFER']
    : ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER'];


  return (
    <form onSubmit={submit} className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(isSale ? '/sales' : '/purchases')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            {editId ? 'Edit' : 'Add'} {isSale ? 'Sale' : 'Purchase'}
          </h1>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* ── Header ── */}
      <section className="grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type={isSale ? 'datetime-local' : 'date'}
            {...register('date')}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Reference</Label>
          <Input placeholder="Auto if blank" {...register('reference')} />
        </div>
        <div className="space-y-1.5">
          <Label>Warehouse</Label>
          <select className={selectCls} {...register('warehouseId')}>
            <option value="">Active branch</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{isSale ? 'Customer' : 'Supplier'}</Label>
          <Controller
            control={control}
            name="partyId"
            rules={{
              required: `${isSale ? 'Customer' : 'Supplier'} is required`,
            }}
            render={({ field }) => (
              <InfiniteSelect
                value={field.value}
                onChange={field.onChange}
                queryKey={[isSale ? 'customers' : 'suppliers']}
                path={isSale ? '/customers' : '/suppliers'}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => c.name}
                selectedLabel={
                  isSale
                    ? pickedCustomerLabel ||
                      (editing as { customer?: { name?: string } })?.customer
                        ?.name ||
                      prefillQuote.data?.party?.name
                    : (editing as { supplier?: { name?: string } })?.supplier
                        ?.name ?? prefillQuote.data?.party?.name
                }
                placeholder={`Select ${isSale ? 'customer' : 'supplier'}…`}
              />
            )}
          />
          <FieldError message={errors.partyId?.message as string} />
          {isSale && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setViewCustomerOpen(true)}
              >
                View patient
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setAddCustomerOpen(true)}
              >
                + Add patient
              </Button>
            </div>
          )}
        </div>
        {isSale && (
          <div className="space-y-1.5">
            <Label>Referral</Label>
            <Controller
              control={control}
              name="referralId"
              render={({ field }) => (
                <InfiniteSelect
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    if (!id) setValue('referralName', '');
                  }}
                  onSelect={(r) =>
                    setValue('referralName', (r as { name: string }).name)
                  }
                  queryKey={['integration-referrals']}
                  path="/integration/referrals"
                  getOptionValue={(r) => r.id}
                  getOptionLabel={(r) => r.name}
                  selectedLabel={live.referralName || undefined}
                  placeholder="Select referral…"
                  clearable
                />
              )}
            />
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setAddReferralOpen(true)}
            >
              + Add referral
            </Button>
          </div>
        )}
        {isSale && (
          <div className="space-y-1.5">
            <Label>Biller</Label>
            <select className={selectCls} {...register('billerId')}>
              <option value="">— none —</option>
              {(billers ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select className={selectCls} {...register('status')}>
            {statusOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Order items ── */}
      <section className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Order items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...EMPTY_ROW })}
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Product Name</th>
                {isSale ? (
                  <>
                    <th className="px-1">Batch Number</th>
                    <th className="px-1">Expiry</th>
                    <th className="px-1">HSN Code</th>
                    <th className="px-1">Pack Quantity</th>
                    <th className="px-1">Quantity</th>
                    <th className="px-1">Discount</th>
                    <th className="px-1">Tax</th>
                  </>
                ) : (
                  <>
                    <th className="px-1">Batch</th>
                    <th className="px-1">Expiry Date</th>
                    <th className="px-1">Pack Size</th>
                    <th className="px-1">Pack Quantity</th>
                    <th className="px-1">Free Pack Quantity</th>
                    <th className="px-1">Rate</th>
                    <th className="px-1">MRP</th>
                    <th className="px-1">Discount</th>
                    <th className="px-1 text-right">Product Tax</th>
                  </>
                )}
                <th className="px-1 text-right">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id} className="border-b align-top">
                  <td className="py-2 pr-2" style={{ minWidth: 220 }}>
                    {isSale ? (
                      // EZHT single batch-row autocomplete: picking a row fills the
                      // whole line (product + batch + expiry + hsn + pack + price)
                      // with that batch locked.
                      <BatchSearchSelect
                        value={watchedItems[i]?.productName ?? ''}
                        warehouseId={live.warehouseId || undefined}
                        onPick={(r) => {
                          setValue(`items.${i}.productId`, r.productId);
                          setValue(`items.${i}.productName`, r.productName);
                          setValue(`items.${i}.productCode`, r.productCode ?? '');
                          setValue(`items.${i}.optionId`, r.optionId ?? '');
                          setValue(`items.${i}.batchId`, r.batchId);
                          setValue(
                            `items.${i}.batchNo`,
                            r.serialNo ?? r.batchNo ?? '',
                          );
                          setValue(
                            `items.${i}.expiryDate`,
                            r.expiryDate ? r.expiryDate.slice(0, 10) : '',
                          );
                          setValue(`items.${i}.hsnCode`, r.hsnCode ?? '');
                          setValue(
                            `items.${i}.packSize`,
                            r.packSize != null ? String(r.packSize) : '',
                          );
                          setValue(`items.${i}.packQuantity`, '1');
                          setValue(`items.${i}.quantity`, '1');
                          setValue(`items.${i}.unitPrice`, String(r.price ?? 0));
                          setValue(
                            `items.${i}.mrp`,
                            r.mrp != null ? String(r.mrp) : '',
                          );
                          setValue(`items.${i}.taxRateId`, r.taxRateId ?? '');
                          setValue(`items.${i}.taxRate`, String(r.taxRate ?? 0));
                          setValue(`items.${i}.taxInclusive`, r.isTaxIncluded);
                        }}
                      />
                    ) : (
                      <Controller
                        control={control}
                        name={`items.${i}.productId`}
                        render={({ field }) => (
                          <InfiniteSelect
                            value={field.value}
                            onChange={field.onChange}
                            onSelect={(p) => {
                              setValue(`items.${i}.productName`, p.name);
                              setValue(`items.${i}.productCode`, p.code ?? '');
                              setValue(`items.${i}.optionId`, '');
                              // EZHT purchase auto-fill: Rate = Pack Cost, MRP =
                              // Pack MRP, Pack Size from the product, Pack Qty = 1,
                              // and the line tax rate from the product's default tax.
                              const ps = Number(p.packSize) || 1;
                              setValue(
                                `items.${i}.packSize`,
                                p.packSize != null ? String(p.packSize) : '',
                              );
                              setValue(`items.${i}.packQuantity`, '1');
                              setValue(
                                `items.${i}.unitPrice`,
                                String(
                                  p.packCost ??
                                    (p.cost != null ? p.cost * ps : 0),
                                ),
                              );
                              setValue(
                                `items.${i}.mrp`,
                                String(
                                  p.packMrp ??
                                    (p.price != null ? p.price * ps : 0),
                                ),
                              );
                              setValue(`items.${i}.taxRateId`, p.taxRateId ?? '');
                              setValue(
                                `items.${i}.taxRate`,
                                String(p.taxRatePercent ?? 0),
                              );
                            }}
                            queryKey={['products']}
                            path="/products"
                            getOptionValue={(p) => p.id}
                            getOptionLabel={(p) => p.name}
                            selectedLabel={watchedItems[i]?.productName}
                            placeholder="Select product…"
                          />
                        )}
                      />
                    )}
                  </td>

                  {isSale ? (
                    <>
                      <td className="px-1" style={{ width: 120 }}>
                        <Input
                          className={inputSm}
                          readOnly
                          placeholder="—"
                          {...register(`items.${i}.batchNo`)}
                        />
                      </td>
                      <td className="px-1">
                        <Input
                          type="date"
                          className={inputSm}
                          readOnly
                          {...register(`items.${i}.expiryDate`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 90 }}>
                        <Input
                          className={inputSm}
                          {...register(`items.${i}.hsnCode`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 90 }}>
                        <Input
                          type="number"
                          step="any"
                          className={inputSm}
                          {...register(`items.${i}.packQuantity`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 80 }}>
                        <Input
                          type="number"
                          step="any"
                          className={inputSm}
                          {...register(`items.${i}.quantity`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 80 }}>
                        <Input
                          className={inputSm}
                          placeholder="0 or 5%"
                          {...register(`items.${i}.discount`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 130 }}>
                        <select
                          className={`${selectCls} h-9`}
                          value={watchedItems[i]?.taxRateId ?? ''}
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
                        </select>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-1" style={{ width: 120 }}>
                        <Input
                          className={inputSm}
                          {...register(`items.${i}.batchNo`)}
                        />
                      </td>
                      <td className="px-1">
                        <Input
                          type="date"
                          className={inputSm}
                          {...register(`items.${i}.expiryDate`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 90 }}>
                        <Input
                          type="number"
                          step="any"
                          className={inputSm}
                          {...register(`items.${i}.packSize`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 90 }}>
                        <Input
                          type="number"
                          step="any"
                          className={inputSm}
                          {...register(`items.${i}.packQuantity`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 90 }}>
                        <Input
                          type="number"
                          step="any"
                          className={inputSm}
                          {...register(`items.${i}.freePackQuantity`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 100 }}>
                        <Input
                          type="number"
                          step="any"
                          className={inputSm}
                          {...register(`items.${i}.unitPrice`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 100 }}>
                        <Input
                          type="number"
                          step="any"
                          className={inputSm}
                          {...register(`items.${i}.mrp`)}
                        />
                      </td>
                      <td className="px-1" style={{ width: 80 }}>
                        <Input
                          className={inputSm}
                          placeholder="0 or 5%"
                          {...register(`items.${i}.discount`)}
                        />
                      </td>
                      <td className="px-1 text-right tabular-nums text-muted-foreground">
                        {Number(watchedItems[i]?.taxRate || 0) > 0
                          ? `(${Number(watchedItems[i]?.taxRate || 0)}%) `
                          : ''}
                        {(totals.lines[i]?.taxAmount ?? 0).toFixed(2)}
                      </td>
                    </>
                  )}

                  <td className="px-1 text-right tabular-nums">
                    {(totals.lines[i]?.subtotal ?? 0).toFixed(2)}
                  </td>
                  <td className="px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── More options ── */}
        <section className="space-y-3 rounded-lg border p-4">
          <Label className="text-base">More options</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shipping</Label>
              <Input type="number" step="any" {...register('shipping')} />
            </div>
            {isSale && (
              <div className="space-y-1.5">
                <Label>Order tax %</Label>
                <Input type="number" step="any" {...register('orderTax')} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Order discount</Label>
              <Input placeholder="0 or 5%" {...register('orderDiscount')} />
            </div>
            {isSale && (
              <div className="space-y-1.5">
                <Label>Payment term (days)</Label>
                <Input type="number" {...register('paymentTerm')} />
              </div>
            )}
            {isSale && (
              <div className="space-y-1.5">
                <Label>GST number</Label>
                <Input {...register('gstNumber')} />
              </div>
            )}
            {isSale && (
              <div className="space-y-1.5">
                <Label>GST state</Label>
                <Input {...register('gstState')} />
              </div>
            )}
            {isSale && (
              <div className="col-span-2 space-y-1.5">
                <Label>Order tags</Label>
                <Input
                  placeholder="Comma-separated tags"
                  {...register('orderTags')}
                />
              </div>
            )}
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('interState')} />
              Inter-state (IGST); unchecked = CGST + SGST
            </label>
            <div className="col-span-2 space-y-1.5">
              <Label>Document</Label>
              <Controller
                control={control}
                name="attachmentUrl"
                render={({ field }) => (
                  <AttachmentUpload
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Note</Label>
              <Input {...register('note')} />
            </div>
            {isSale && (
              <div className="col-span-2 space-y-1.5">
                <Label>Staff note (internal)</Label>
                <Input {...register('staffNote')} />
              </div>
            )}
            {!isSale && editId && (
              <div className="col-span-2 space-y-1.5">
                <Label>Edit note (audit)</Label>
                <Input {...register('editNote')} />
              </div>
            )}
            {!isSale && (
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('isBloodDonation')} />
                Blood-donation receipt
              </label>
            )}
            {!isSale && live.isBloodDonation && (
              <div className="col-span-2 space-y-1.5">
                <Label>Donor name</Label>
                <Input {...register('donorName')} />
              </div>
            )}
          </div>
        </section>

        {/* ── Totals + payment ── */}
        <section className="space-y-4">
          <div className="space-y-1 rounded-lg border p-4 text-sm">
            <Row label="Items" value={totals.totalItems} />
            <Row label="Total" value={totals.subtotal} money />
            <Row label="Product discount" value={totals.productDiscount} money />
            <Row label="Order discount" value={totals.orderDiscount} money />
            <Row label="Tax" value={totals.totalTax} money />
            <Row label="Shipping" value={totals.shipping} money />
            {!isSale && (
              <Row
                label="Roundoff"
                value={
                  (totals as { roundoff?: number }).roundoff ?? 0
                }
                money
              />
            )}
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Grand total</span>
              <span className="tabular-nums">{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <Label className="text-base">Payment</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment status</Label>
                <select className={selectCls} {...register('paymentStatus')}>
                  <option value="due">Due</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              {paymentStatus === 'partial' && (
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input type="number" step="any" {...register('paymentAmount')} />
                </div>
              )}
              {paymentStatus !== 'due' && (
                <div className="space-y-1.5">
                  <Label>Paid by</Label>
                  <select className={selectCls} {...register('paidBy')}>
                    {paidByOptions.map((m) => (
                      <option key={m} value={m}>
                        {m.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {paymentStatus !== 'due' && paidBy === 'CHEQUE' && (
                <div className="space-y-1.5">
                  <Label>Cheque no</Label>
                  <Input {...register('chequeNo')} />
                </div>
              )}
              {paymentStatus !== 'due' && paidBy === 'CARD' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Card no</Label>
                    <Input {...register('ccNo')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Card holder</Label>
                    <Input {...register('ccHolder')} />
                  </div>
                </>
              )}
              {paymentStatus !== 'due' &&
                paidBy === 'GIFT_CARD' &&
                isSale && (
                  <div className="space-y-1.5">
                    <Label>Gift card no</Label>
                    <Input {...register('giftCardNo')} />
                  </div>
                )}
            </div>
          </div>
        </section>
      </div>

      {isSale && (
        <>
          <AddReferralDialog
            open={addReferralOpen}
            onOpenChange={setAddReferralOpen}
            onCreated={(r) => {
              setValue('referralId', r.id);
              setValue('referralName', r.name);
            }}
          />
          <ViewCustomerDialog
            customerId={live.partyId || null}
            open={viewCustomerOpen}
            onOpenChange={setViewCustomerOpen}
          />
          <AddCustomerDialog
            open={addCustomerOpen}
            onOpenChange={setAddCustomerOpen}
            onCreated={(c) => {
              setValue('partyId', c.id);
              setPickedCustomerLabel(c.name);
            }}
          />
        </>
      )}
    </form>
  );
}

function Row({
  label,
  value,
  money,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        {money ? value.toFixed(2) : Math.round(value)}
      </span>
    </div>
  );
}
