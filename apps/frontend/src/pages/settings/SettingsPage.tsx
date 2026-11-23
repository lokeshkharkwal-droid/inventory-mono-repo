import { useEffect, useMemo } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage, getTokenPayload } from '@/lib/http';
import { LottieLoader } from '@/components/LottieLoader';
import { useSettings, useUpdateSettings } from '@/features/settings/api';

/**
 * All settings fields as the form holds them: strings for text/number inputs,
 * booleans for checkboxes. Ported to full EZHealthTrack (SMA) parity. The form is
 * branch-scoped — the backend resolves the active branch from the JWT, so these
 * values are independent per branch and reload when the user switches branch.
 */
interface FormValues {
  // General
  defaultCurrencyCode: string;
  rowsPerPage: string;
  decimalPlaces: string;
  quantityDecimals: string;
  dateFormat: string;
  timezone: string;
  localLanguage: string;
  isOversellingAllowed: boolean;

  // Number formatting
  decimalSeparator: string;
  thousandsSeparator: string;
  currencySymbol: string;
  isCurrencySymbolShown: boolean;
  isSacEnabled: boolean;

  // Document numbering prefixes
  purchasePrefix: string;
  salePrefix: string;
  transferPrefix: string;
  requisitionPrefix: string;
  quotePrefix: string;
  deliveryPrefix: string;
  paymentPrefix: string;
  transactionPrefix: string;
  returnPrefix: string;
  expensePrefix: string;
  incomePrefix: string;
  materialPrefix: string;
  productPrefix: string;
  referenceFormat: string;

  // Tax defaults
  defaultProductTaxRateId: string;
  defaultOrderTaxRateId: string;

  // Products & inventory
  isProductSerialEnabled: boolean;
  isProductExpiryEnabled: boolean;
  isProductDiscountEnabled: boolean;
  isRacksEnabled: boolean;
  isAttributesEnabled: boolean;
  isAllProductsDisplayed: boolean;
  isExpiredRemoved: boolean;
  isExpiredSaleBlocked: boolean;
  isQuotationSalesReducing: boolean;
  expiryAlertDays: string;

  // Barcode
  isBarcodeAutoDetected: boolean;
  barcodeSeparator: string;
  barcodeFixCount: string;

  // Images
  imageWidth: string;
  imageHeight: string;
  thumbnailWidth: string;
  thumbnailHeight: string;
  isWatermarkEnabled: boolean;

  // Defaults
  defaultWarehouseId: string;
  defaultBillerId: string;
  defaultSupplierId: string;

  // Behaviour & limits
  itemAdditionMethod: string;
  invoiceView: string;
  defaultOrderFocus: string;
  afterSalePage: string;
  discountLimitPercentage: string;
  discountLimitAmount: string;
  editingLockDays: string;
  isPurchaseRoundingEnabled: boolean;
  isSalesRoundingEnabled: boolean;

  // Business profile
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;

  // POS
  posPin: string;
}

/** A labelled text/number input bound to react-hook-form. */
function TextField({
  name,
  label,
  register,
  type = 'text',
}: {
  name: keyof FormValues;
  label: string;
  register: UseFormRegister<FormValues>;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} {...register(name)} />
    </div>
  );
}

/** A labelled checkbox bound to react-hook-form. */
function CheckboxField({
  name,
  label,
  register,
}: {
  name: keyof FormValues;
  label: string;
  register: UseFormRegister<FormValues>;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" {...register(name)} /> {label}
    </label>
  );
}

/** Branch-scoped inventory settings + document numbering (EZHT parity). */
export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  // Show which branch these settings apply to (settings are per-branch).
  const activeBranchName = useMemo(() => {
    const payload = getTokenPayload();
    if (!payload) return null;
    const active = (payload.profiles ?? []).find(
      (p) => p.branch_id === payload.active_branch_id,
    );
    return active?.branch_name ?? null;
  }, []);

  useEffect(() => {
    if (!data) return;
    const s = (v: string | number | null | undefined) =>
      v === null || v === undefined ? '' : String(v);
    reset({
      defaultCurrencyCode: s(data.defaultCurrencyCode),
      rowsPerPage: s(data.rowsPerPage),
      decimalPlaces: s(data.decimalPlaces),
      quantityDecimals: s(data.quantityDecimals),
      dateFormat: s(data.dateFormat),
      timezone: s(data.timezone),
      localLanguage: s(data.localLanguage),
      isOversellingAllowed: data.isOversellingAllowed,

      decimalSeparator: s(data.decimalSeparator),
      thousandsSeparator: s(data.thousandsSeparator),
      currencySymbol: s(data.currencySymbol),
      isCurrencySymbolShown: data.isCurrencySymbolShown,
      isSacEnabled: data.isSacEnabled,

      purchasePrefix: s(data.purchasePrefix),
      salePrefix: s(data.salePrefix),
      transferPrefix: s(data.transferPrefix),
      requisitionPrefix: s(data.requisitionPrefix),
      quotePrefix: s(data.quotePrefix),
      deliveryPrefix: s(data.deliveryPrefix),
      paymentPrefix: s(data.paymentPrefix),
      transactionPrefix: s(data.transactionPrefix),
      returnPrefix: s(data.returnPrefix),
      expensePrefix: s(data.expensePrefix),
      incomePrefix: s(data.incomePrefix),
      materialPrefix: s(data.materialPrefix),
      productPrefix: s(data.productPrefix),
      referenceFormat: s(data.referenceFormat),

      defaultProductTaxRateId: s(data.defaultProductTaxRateId),
      defaultOrderTaxRateId: s(data.defaultOrderTaxRateId),

      isProductSerialEnabled: data.isProductSerialEnabled,
      isProductExpiryEnabled: data.isProductExpiryEnabled,
      isProductDiscountEnabled: data.isProductDiscountEnabled,
      isRacksEnabled: data.isRacksEnabled,
      isAttributesEnabled: data.isAttributesEnabled,
      isAllProductsDisplayed: data.isAllProductsDisplayed,
      isExpiredRemoved: data.isExpiredRemoved,
      isExpiredSaleBlocked: data.isExpiredSaleBlocked,
      isQuotationSalesReducing: data.isQuotationSalesReducing,
      expiryAlertDays: s(data.expiryAlertDays),

      isBarcodeAutoDetected: data.isBarcodeAutoDetected,
      barcodeSeparator: s(data.barcodeSeparator),
      barcodeFixCount: s(data.barcodeFixCount),

      imageWidth: s(data.imageWidth),
      imageHeight: s(data.imageHeight),
      thumbnailWidth: s(data.thumbnailWidth),
      thumbnailHeight: s(data.thumbnailHeight),
      isWatermarkEnabled: data.isWatermarkEnabled,

      defaultWarehouseId: s(data.defaultWarehouseId),
      defaultBillerId: s(data.defaultBillerId),
      defaultSupplierId: s(data.defaultSupplierId),

      itemAdditionMethod: s(data.itemAdditionMethod),
      invoiceView: s(data.invoiceView),
      defaultOrderFocus: s(data.defaultOrderFocus),
      afterSalePage: s(data.afterSalePage),
      discountLimitPercentage: s(data.discountLimitPercentage),
      discountLimitAmount: s(data.discountLimitAmount),
      editingLockDays: s(data.editingLockDays),
      isPurchaseRoundingEnabled: data.isPurchaseRoundingEnabled,
      isSalesRoundingEnabled: data.isSalesRoundingEnabled,

      businessName: s(data.businessName),
      businessAddress: s(data.businessAddress),
      businessPhone: s(data.businessPhone),
      businessEmail: s(data.businessEmail),

      posPin: '',
    });
  }, [data, reset]);

  const submit = handleSubmit(async (v) => {
    // Send a string field only when non-empty; a number field parsed; the PIN only
    // when the field was touched (blank keeps it, a space clears it).
    const text = (val: string) => (val.trim() === '' ? undefined : val.trim());
    const int = (val: string) =>
      val.trim() === '' ? undefined : Number(val);
    try {
      await update.mutateAsync({
        defaultCurrencyCode: text(v.defaultCurrencyCode),
        rowsPerPage: int(v.rowsPerPage) ?? 20,
        decimalPlaces: int(v.decimalPlaces) ?? 2,
        quantityDecimals: int(v.quantityDecimals) ?? 2,
        dateFormat: text(v.dateFormat),
        timezone: text(v.timezone),
        localLanguage: text(v.localLanguage),
        isOversellingAllowed: v.isOversellingAllowed,

        decimalSeparator: text(v.decimalSeparator),
        thousandsSeparator: text(v.thousandsSeparator),
        currencySymbol: text(v.currencySymbol),
        isCurrencySymbolShown: v.isCurrencySymbolShown,
        isSacEnabled: v.isSacEnabled,

        purchasePrefix: text(v.purchasePrefix),
        salePrefix: text(v.salePrefix),
        transferPrefix: text(v.transferPrefix),
        requisitionPrefix: text(v.requisitionPrefix),
        quotePrefix: text(v.quotePrefix),
        deliveryPrefix: text(v.deliveryPrefix),
        paymentPrefix: text(v.paymentPrefix),
        transactionPrefix: text(v.transactionPrefix),
        returnPrefix: text(v.returnPrefix),
        expensePrefix: text(v.expensePrefix),
        incomePrefix: text(v.incomePrefix),
        materialPrefix: text(v.materialPrefix),
        productPrefix: text(v.productPrefix),
        referenceFormat: text(v.referenceFormat),

        defaultProductTaxRateId: text(v.defaultProductTaxRateId),
        defaultOrderTaxRateId: text(v.defaultOrderTaxRateId),

        isProductSerialEnabled: v.isProductSerialEnabled,
        isProductExpiryEnabled: v.isProductExpiryEnabled,
        isProductDiscountEnabled: v.isProductDiscountEnabled,
        isRacksEnabled: v.isRacksEnabled,
        isAttributesEnabled: v.isAttributesEnabled,
        isAllProductsDisplayed: v.isAllProductsDisplayed,
        isExpiredRemoved: v.isExpiredRemoved,
        isExpiredSaleBlocked: v.isExpiredSaleBlocked,
        isQuotationSalesReducing: v.isQuotationSalesReducing,
        expiryAlertDays: int(v.expiryAlertDays) ?? 0,

        isBarcodeAutoDetected: v.isBarcodeAutoDetected,
        barcodeSeparator: text(v.barcodeSeparator),
        barcodeFixCount: int(v.barcodeFixCount) ?? 0,

        imageWidth: int(v.imageWidth),
        imageHeight: int(v.imageHeight),
        thumbnailWidth: int(v.thumbnailWidth),
        thumbnailHeight: int(v.thumbnailHeight),
        isWatermarkEnabled: v.isWatermarkEnabled,

        defaultWarehouseId: text(v.defaultWarehouseId),
        defaultBillerId: text(v.defaultBillerId),
        defaultSupplierId: text(v.defaultSupplierId),

        itemAdditionMethod: text(v.itemAdditionMethod),
        invoiceView: text(v.invoiceView),
        defaultOrderFocus: text(v.defaultOrderFocus),
        afterSalePage: text(v.afterSalePage),
        discountLimitPercentage: int(v.discountLimitPercentage),
        discountLimitAmount: int(v.discountLimitAmount),
        editingLockDays: int(v.editingLockDays) ?? 0,
        isPurchaseRoundingEnabled: v.isPurchaseRoundingEnabled,
        isSalesRoundingEnabled: v.isSalesRoundingEnabled,

        businessName: text(v.businessName),
        businessAddress: text(v.businessAddress),
        businessPhone: text(v.businessPhone),
        businessEmail: text(v.businessEmail),

        ...(v.posPin === '' ? {} : { posPin: v.posPin.trim() }),
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save settings'));
    }
  });

  if (isLoading) {
    return <LottieLoader label="Loading settings…" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business settings and document numbering
          {activeBranchName ? (
            <>
              {' '}
              for <span className="font-medium">{activeBranchName}</span>. These
              settings are per-branch — switch branch to manage another.
            </>
          ) : (
            ' (tenant-level default — applies to branches with no own settings).'
          )}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <TextField name="defaultCurrencyCode" label="Default currency" register={register} />
            <TextField name="rowsPerPage" label="Rows per page" type="number" register={register} />
            <TextField name="decimalPlaces" label="Decimal places" type="number" register={register} />
            <TextField name="quantityDecimals" label="Quantity decimals" type="number" register={register} />
            <TextField name="dateFormat" label="Date format" register={register} />
            <TextField name="timezone" label="Timezone" register={register} />
            <TextField name="localLanguage" label="Local language" register={register} />
            <div className="col-span-2 mt-6 md:col-span-3">
              <CheckboxField
                name="isOversellingAllowed"
                label="Allow overselling (negative stock)"
                register={register}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Number &amp; currency formatting</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <TextField name="decimalSeparator" label="Decimal separator" register={register} />
            <TextField name="thousandsSeparator" label="Thousands separator" register={register} />
            <TextField name="currencySymbol" label="Currency symbol" register={register} />
            <div className="mt-6 flex flex-col gap-2">
              <CheckboxField name="isCurrencySymbolShown" label="Show currency symbol" register={register} />
              <CheckboxField name="isSacEnabled" label="South-Asian currency grouping (SAC)" register={register} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document numbering prefixes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <TextField name="salePrefix" label="Sale" register={register} />
            <TextField name="purchasePrefix" label="Purchase" register={register} />
            <TextField name="transferPrefix" label="Transfer" register={register} />
            <TextField name="requisitionPrefix" label="Requisition" register={register} />
            <TextField name="quotePrefix" label="Quotation" register={register} />
            <TextField name="deliveryPrefix" label="Delivery" register={register} />
            <TextField name="paymentPrefix" label="Payment" register={register} />
            <TextField name="transactionPrefix" label="Transaction" register={register} />
            <TextField name="returnPrefix" label="Return" register={register} />
            <TextField name="expensePrefix" label="Expense" register={register} />
            <TextField name="incomePrefix" label="Income" register={register} />
            <TextField name="materialPrefix" label="Material" register={register} />
            <TextField name="productPrefix" label="Product" register={register} />
            <TextField name="referenceFormat" label="Reference format" register={register} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <TextField name="defaultProductTaxRateId" label="Default product tax rate (id)" register={register} />
            <TextField name="defaultOrderTaxRateId" label="Default order tax rate (id)" register={register} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products &amp; inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
              <CheckboxField name="isProductSerialEnabled" label="Product serial numbers" register={register} />
              <CheckboxField name="isProductExpiryEnabled" label="Product expiry" register={register} />
              <CheckboxField name="isProductDiscountEnabled" label="Product discount" register={register} />
              <CheckboxField name="isRacksEnabled" label="Racks" register={register} />
              <CheckboxField name="isAttributesEnabled" label="Attributes / variants" register={register} />
              <CheckboxField name="isAllProductsDisplayed" label="Show all products (incl. zero stock)" register={register} />
              <CheckboxField name="isExpiredRemoved" label="Auto-remove expired products" register={register} />
              <CheckboxField name="isExpiredSaleBlocked" label="Block selling expired batches" register={register} />
              <CheckboxField name="isQuotationSalesReducing" label="Reduce quotation sales" register={register} />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <TextField name="expiryAlertDays" label="Expiry alert (days)" type="number" register={register} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Barcode</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <TextField name="barcodeSeparator" label="Barcode separator" register={register} />
            <TextField name="barcodeFixCount" label="Barcode fix count" type="number" register={register} />
            <div className="mt-6">
              <CheckboxField name="isBarcodeAutoDetected" label="Auto-detect barcode" register={register} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <TextField name="imageWidth" label="Image width" type="number" register={register} />
            <TextField name="imageHeight" label="Image height" type="number" register={register} />
            <TextField name="thumbnailWidth" label="Thumbnail width" type="number" register={register} />
            <TextField name="thumbnailHeight" label="Thumbnail height" type="number" register={register} />
            <div className="mt-6">
              <CheckboxField name="isWatermarkEnabled" label="Watermark images" register={register} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <TextField name="defaultWarehouseId" label="Default warehouse (id)" register={register} />
            <TextField name="defaultBillerId" label="Default biller (id)" register={register} />
            <TextField name="defaultSupplierId" label="Default supplier (id)" register={register} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Behaviour &amp; limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <TextField name="itemAdditionMethod" label="Item addition method" register={register} />
              <TextField name="invoiceView" label="Invoice view" register={register} />
              <TextField name="defaultOrderFocus" label="Default order focus" register={register} />
              <TextField name="afterSalePage" label="After-sale page" register={register} />
              <TextField name="discountLimitPercentage" label="Discount limit (%)" type="number" register={register} />
              <TextField name="discountLimitAmount" label="Discount limit (amount)" type="number" register={register} />
              <TextField name="editingLockDays" label="Editing lock (days)" type="number" register={register} />
            </div>
            <div className="flex flex-col gap-2">
              <CheckboxField name="isPurchaseRoundingEnabled" label="Round off purchase totals" register={register} />
              <CheckboxField name="isSalesRoundingEnabled" label="Round off sales totals" register={register} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <TextField name="businessName" label="Business name" register={register} />
            <TextField name="businessPhone" label="Phone" register={register} />
            <TextField name="businessEmail" label="Email" register={register} />
            <TextField name="businessAddress" label="Address" register={register} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Point of Sale</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="posPin">Cashier PIN</Label>
              <Input
                id="posPin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder={
                  data?.hasPosPin ? '•••• (set — leave blank to keep)' : 'Not set'
                }
                {...register('posPin')}
              />
              <p className="text-xs text-muted-foreground">
                Locks the POS terminal. Leave blank to keep the current PIN; enter
                a space to remove it.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
